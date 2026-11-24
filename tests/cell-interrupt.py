from playwright.sync_api import sync_playwright, expect


with sync_playwright() as p:
    browser = p.chromium.launch()
    for width in (1440, 375):
        for reduced, phase in ((True, 'morph'), (False, 'morph'), (True, 'release'), (False, 'release')):
            page = browser.new_page(viewport={'width': width, 'height': 900})
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto('http://127.0.0.1:4173/experience/')
            page.locator('#record-control').click()
            page.wait_for_selector('body[data-state=scene]')
            page.locator('.light-cells').evaluate("el=>el.scrollIntoView({block:'center',behavior:'instant'})")
            box=page.locator('.living-cell').first.bounding_box()
            page.mouse.click(box['x']+box['width']/2,box['y']+box['height']/2)
            field = page.locator('.light-cells')
            expect(field).to_have_attribute('data-count', '6')
            daughters = page.locator('.living-cell')
            first = daughters.nth(-2)
            second = daughters.last
            first_id = first.get_attribute('data-cell-id')
            gradient_id = 'cell-core-' + first_id
            morph = page.locator('.cell-fusion:has(linearGradient[id="' + gradient_id + '"])')
            page.wait_for_function('''([id, phase]) => {
                const svg = document.getElementById(id)?.closest('svg');
                const progress = Number(svg?.dataset.progress);
                return phase==='release' ? svg?.dataset.phase==='release' && Number(svg.dataset.release)>.2 : progress > .35 && progress < .65;
            }''', arg=[gradient_id, phase])
            if reduced:
                page.emulate_media(reduced_motion='reduce')
            assert morph.count() == 1, 'The test must interrupt an active split'

            # Pick the exposed side of the first daughter, outside its overlapping sibling.
            point = first.evaluate('''node => {
                const a = node.getBoundingClientRect();
                const b = node.nextElementSibling.getBoundingClientRect();
                const cx = a.x + a.width / 2, cy = a.y + a.height / 2;
                const dx = cx - b.x - b.width / 2, dy = cy - b.y - b.height / 2;
                const length = Math.hypot(dx, dy) || 1;
                return {x: cx + dx / length * a.width * .3,
                    y: cy + dy / length * a.height * .3, cx, cy};
            }''')
            assert page.evaluate('''point => document.elementFromPoint(point.x, point.y)
                ?.closest('[data-cell-id]')?.dataset.cellId''', point) == first_id
            dx = 60 if point['cx'] + 60 < width - 55 else -60
            page.mouse.move(point['x'], point['y'])
            page.mouse.down()
            page.mouse.move(point['x'] + dx, point['y'] + 20, steps=10)
            page.mouse.up()

            expect(morph).to_have_count(0)
            expect(field).to_have_attribute('data-count', '6')
            for daughter in (first, second):
                styles = daughter.evaluate('''node => ({
                    membrane: Number(getComputedStyle(node.querySelector('img')).opacity),
                    nucleus: Number(getComputedStyle(node.querySelector('.cell-nucleus')).opacity),
                    scale: node.style.scale,
                    fusion: node.style.getPropertyValue('--fusion'),
                    coreFusion: node.style.getPropertyValue('--core-fusion'),
                })''')
                assert styles == {'membrane': 1, 'nucleus': .72, 'scale': '',
                    'fusion': '', 'coreFusion': ''}, (width, reduced, styles)
            moved = first.bounding_box()
            assert abs(moved['x'] + moved['width'] / 2 - point['cx']) > 40, 'The daughter must actually move'
            if reduced:
                frozen = first.get_attribute('style')
                page.wait_for_timeout(150)
                assert first.get_attribute('style') == frozen, 'Cleanup must not resume reduced motion'
                page.emulate_media(reduced_motion='no-preference')
            page.wait_for_timeout(100)
            expect(morph).to_have_count(0)
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            assert not errors, errors
            page.close()
    browser.close()

print('Reduced-motion and running split interruption restores both daughters at 1440/375')
