"""The light-only page ignores former dark preferences and has no theme controls."""
import os
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get("SITE_URL", "http://127.0.0.1:4173").rstrip("/")

with sync_playwright() as p:
    browser = p.chromium.launch()
    for width, height in [(1440, 900), (375, 812)]:
        for stored_dark, os_theme in [(False, "light"), (True, "dark")]:
            page = browser.new_page(
                viewport={"width": width, "height": height},
                color_scheme=os_theme,
                reduced_motion="reduce",
            )
            if stored_dark:
                page.add_init_script("localStorage.setItem('theme', 'dark')")
            errors = []
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.goto(BASE + "/experience/")

            def assert_light():
                expect(page.locator("html")).to_have_attribute("data-theme", "light")
                assert page.evaluate("getComputedStyle(document.documentElement).colorScheme") == "light"
                assert page.evaluate("getComputedStyle(document.body).backgroundColor") == "rgb(247, 248, 246)"
                assert page.locator("#theme-toggle, .theme-switch, #aquarium, #aquarium-pause").count() == 0
                assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")

            assert_light()
            expect(page.locator(".light-cells")).to_be_hidden()
            page.locator("#record-control").click()
            page.wait_for_function("document.body.dataset.state === 'scene'")
            expect(page.locator(".light-cells")).to_have_attribute("data-count", "5")
            assert_light()
            page.locator("[data-lang=ru]").click()
            expect(page.get_by_role("button", name="Разделить клетку", exact=True)).to_have_count(5)
            page.locator("[data-lang=en]").click()
            expect(page.get_by_role("button", name="Divide cell", exact=True)).to_have_count(5)
            page.locator("#skills").scroll_into_view_if_needed()
            assert_light()
            page.reload()
            assert_light()
            assert not errors, errors
            page.close()
    browser.close()

print("Light only, old dark preference, OS dark, no theme/aquarium controls, language and 1440/375 layout: passed.")
