import os
BASE = os.environ.get("SITE_URL", "http://127.0.0.1:4173").rstrip("/")
"""Run against the local static server: python tests/smoke.py. Requires Playwright Chromium."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
results = []
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    for width, height in [(1440, 900), (375, 812)]:
        page = browser.new_page(viewport={'width': width, 'height': height}, reduced_motion='reduce')
        errors, missing = [], []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('response', lambda r: missing.append(r.url) if r.status >= 400 and '127.0.0.1' in r.url else None)
        page.goto(BASE+'/?preview=hero-player', wait_until='networkidle')
        page.wait_for_url('**/experience/?preview=hero-player')
        assert page.locator('html').get_attribute('lang') == 'en'
        page.screenshot(path=f'/tmp/site-after-{width}-intro.png')
        page.locator('#record-control').click()
        page.wait_for_function("document.body.dataset.state==='scene'")
        page.wait_for_timeout(300)
        page.screenshot(path=f'/tmp/site-after-{width}-scene.png', full_page=True)
        assert page.locator('#circulation').count() == 0
        assert page.locator('#heart-scene').get_attribute('role') != 'button'
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.locator('[data-lang="ru"]').click()
        assert page.locator('html').get_attribute('lang') == 'ru'
        page.locator('[data-lang="en"]').click()
        for target in ['about', 'skills', 'work', 'contact']:
            page.locator(f'.hero-navigation a[href="#{target}"]').click(force=True)
            page.wait_for_timeout(100)
            assert page.locator('#'+target).is_visible()
        page.locator('[data-project="pulse"]').click()
        assert page.locator('#project-dialog').is_visible()
        page.keyboard.press('Escape')
        assert not page.locator('#project-dialog').is_visible()
        page.locator('[data-method="telegram"] .contact-trigger').click()
        link = page.locator('[data-method="telegram"] .contact-result')
        link.wait_for(state='visible')
        assert link.get_attribute('href') == 'https://t.me/timmy_zhfs'
        assert page.locator('[data-method="email"] .contact-result').get_attribute('href') == 'mailto:temirrrlan07@gmail.com'
        assert not errors, errors
        assert not missing, missing
        results.append({'viewport': [width, height], 'page_errors': errors, 'missing_local_resources': missing, 'status': 'passed'})
        page.close()
    # Preserve anchors and language when entering through the root.
    page = browser.new_page()
    page.goto(BASE+'/?lang=ru#skills')
    page.wait_for_url('**/experience/?lang=ru#skills')
    browser.close()
(ROOT/'docs/verification.json').write_text(json.dumps(results, indent=2))
print(json.dumps(results, indent=2))
