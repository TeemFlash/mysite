"""Intro entry and atomic player reveal; audio gestures are stubbed, not playback."""
import os
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('SITE_URL', 'http://127.0.0.1:4173').rstrip('/')
AUDIO_STUB = '''
    window.entryAudio = {plays: 0, pauses: 0};
    Object.defineProperty(HTMLMediaElement.prototype, 'paused', {
        get() { return this.entryPaused !== false; }
    });
    HTMLMediaElement.prototype.play = function() {
        entryAudio.plays++;
        this.entryPaused = false;
        this.dispatchEvent(new Event('play'));
        return Promise.resolve();
    };
    HTMLMediaElement.prototype.pause = function() {
        if (!this.paused) entryAudio.pauses++;
        this.entryPaused = true;
        this.dispatchEvent(new Event('pause'));
    };
'''
DECODE_GATE = '''
    window.imageDecodes = [];
    const decode = HTMLImageElement.prototype.decode;
    HTMLImageElement.prototype.decode = function() {
        if (!this.closest('#player-shell')) return decode.call(this);
        const entry = {decoded: false};
        const gate = new Promise(resolve => entry.release = resolve);
        imageDecodes.push(entry);
        return decode.call(this).then(() => {
            entry.decoded = true;
            return gate;
        });
    };
'''


def new_page(browser, width=1440, touch=False, motion='reduce'):
    page = browser.new_page(viewport={'width': width, 'height': 900},
                            has_touch=touch, is_mobile=touch, reduced_motion=motion)
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.route('https://audio-ssl.itunes.apple.com/**', lambda route: route.abort())
    page.add_init_script(AUDIO_STUB)
    return page, errors


def ready(page, touch=False):
    expect(page.locator('body')).to_have_attribute('data-ready', 'true')
    expect(page.locator('#record-control')).to_be_enabled()
    expect(page.locator('.intro-entry')).to_have_text(
        'Loading…Click anywhere or press any key to startTap anywhere to start')
    assert page.locator('.intro-entry').inner_text().strip() == (
        'Tap anywhere to start' if touch else 'Click anywhere or press any key to start')


def still_loading(page):
    assert page.locator('body').get_attribute('data-ready') != 'true'
    expect(page.locator('#record-control')).to_be_disabled()
    assert page.locator('.intro-entry').inner_text().strip() == 'Loading…'
    assert page.locator('#player-shell, #player-shell *').evaluate_all(
        "nodes => nodes.every(node => getComputedStyle(node).visibility === 'hidden')")
    expect(page.locator('body')).to_have_attribute('data-state', 'intro')


def scene(page, errors):
    expect(page.locator('body')).to_have_attribute('data-state', 'scene')
    expect(page.locator('.intro-entry')).to_be_hidden()
    assert page.evaluate('entryAudio.plays') == 1, 'One gesture must start audio once'
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    assert not errors, errors


with sync_playwright() as p:
    browser = p.chromium.launch()
    # Network completion alone is insufficient: all three image layers must decode.
    page, errors = new_page(browser, motion='no-preference')
    pending = []
    page.route('**/*reference-turntable*.png', lambda route: pending.append(route))
    page.add_init_script(DECODE_GATE)
    page.goto(BASE + '/experience/', wait_until='domcontentloaded')
    page.wait_for_function('window.imageDecodes.length === 3')
    assert pending, 'The test must hold the actual player PNG request'
    page.keyboard.press('a')
    still_loading(page)
    for route in pending:
        route.continue_()
    page.wait_for_function('imageDecodes.every(entry => entry.decoded)')
    page.evaluate('imageDecodes.slice(0, -1).forEach(entry => entry.release())')
    still_loading(page)
    page.evaluate('imageDecodes.at(-1).release()')
    ready(page)
    expect(page.locator('#player-shell')).to_have_attribute('data-image-ready', 'true')
    expect(page.locator('#player-shell')).to_be_visible()
    for key in ['Tab', 'Escape', 'Shift']:
        page.keyboard.press(key)
    page.evaluate('''() => {
        for (const options of [{key:'a',repeat:true}, {key:'a',isComposing:true},
            {key:'r',ctrlKey:true}, {key:'r',metaKey:true}, {key:'a',altKey:true}])
            document.dispatchEvent(new KeyboardEvent('keydown', options));
    }''')
    expect(page.locator('body')).to_have_attribute('data-state', 'intro')
    assert page.evaluate('entryAudio.plays') == 0
    page.keyboard.press('a')
    expect(page.locator('.intro-entry')).to_be_hidden()
    page.keyboard.press('a')
    scene(page, errors)
    page.close()

    # Off-player mouse entry starts once, including clicks during the transition.
    page, errors = new_page(browser, motion='no-preference')
    page.goto(BASE + '/experience/')
    ready(page)
    assert page.locator('#player-shell').bounding_box()['x'] > 10
    for button in ['right', 'middle']:
        page.mouse.click(10, 10, button=button)
    expect(page.locator('body')).to_have_attribute('data-state', 'intro')
    assert page.evaluate('entryAudio.plays') == 0
    page.mouse.click(10, 10)
    page.mouse.dblclick(10, 10)
    scene(page, errors)
    page.mouse.dblclick(10, 10)
    scene(page, errors)
    page.close()

    # Native keyboard activation on the focused button must not start twice.
    for key in ['Enter', 'Space']:
        page, errors = new_page(browser)
        page.goto(BASE + '/experience/')
        ready(page)
        page.locator('#record-control').focus()
        page.keyboard.press(key)
        scene(page, errors)
        page.close()

    page, errors = new_page(browser)
    page.goto(BASE + '/experience/')
    ready(page)
    page.locator('#record-control').click()
    scene(page, errors)
    page.locator('#record-control').click()
    assert page.evaluate('entryAudio') == {'plays': 1, 'pauses': 1}
    page.locator('#record-control').click()
    assert page.evaluate('entryAudio') == {'plays': 2, 'pauses': 1}
    assert not errors, errors
    page.close()

    for width in [390, 320]:
        page, errors = new_page(browser, width=width, touch=True)
        page.goto(BASE + '/experience/')
        ready(page, touch=True)
        assert page.locator('#player-shell').bounding_box()['x'] > 10
        page.touchscreen.tap(10, 10)
        scene(page, errors)
        page.touchscreen.tap(10, 10)
        assert page.evaluate('entryAudio.plays') == 1
        page.close()

    # A broken image keeps its decorative layers hidden but does not lock entry.
    page, errors = new_page(browser)
    page.route('**/*reference-turntable*.png', lambda route: route.abort())
    page.goto(BASE + '/experience/')
    ready(page)
    expect(page.locator('#player-shell')).to_have_attribute('data-image-ready', 'false')
    expect(page.locator('#player-shell')).to_be_hidden()
    page.mouse.click(10, 10)
    scene(page, errors)
    expect(page.locator('#player-shell')).to_be_hidden()
    page.close()
    browser.close()
print('Intro entry: delayed load/decode, keyboard, desktop clicks, mouse playback, phone taps and image failure passed')
