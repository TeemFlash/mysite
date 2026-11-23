from playwright.sync_api import sync_playwright, expect

with sync_playwright() as p:
    browser=p.chromium.launch()
    for width in (1440,375):
        page=browser.new_page(viewport={'width':width,'height':900})
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto('http://127.0.0.1:4173/experience/')
        page.locator('#record-control').click()
        page.wait_for_selector('body[data-state=scene]')
        cell=page.locator('.living-cell').first
        cell.wait_for()
        before=cell.bounding_box()
        page.wait_for_timeout(600)
        assert cell.bounding_box()!=before, 'Cell should drift'
        page.emulate_media(reduced_motion='reduce')
        before=cell.bounding_box()
        page.wait_for_timeout(250)
        assert cell.bounding_box()==before, 'Reduced motion should freeze motion'
        cell.click()
        expect(page.locator('.light-cells')).to_have_attribute('data-count','6')
        page.wait_for_timeout(500)
        first=page.locator('.living-cell').nth(-2).bounding_box()
        second=page.locator('.living-cell').last.bounding_box()
        x=second['x']+second['width']/2;y=second['y']+second['height']/2
        page.mouse.move(x,y);page.mouse.down()
        page.mouse.move(first['x']+first['width']/2+50,first['y']+first['height']/2,steps=10);page.mouse.up()
        source_colors=page.locator('.living-cell').evaluate_all('(nodes)=>nodes.slice(-2).map(n=>getComputedStyle(n.querySelector(".cell-nucleus")).backgroundColor)')
        page.emulate_media(reduced_motion='no-preference')
        page.wait_for_function("Number(document.querySelector('.cell-fusion').style.opacity) > .1",timeout=7000)
        assert page.locator('.living-cell').count()==6, 'Both membranes remain during fusion'
        outline=page.locator('.cell-fusion > path').first.get_attribute('d')
        assert ' C ' in outline and ' L ' not in outline and outline.endswith(' Z'), 'Smooth closed membrane without polygon seams'
        fused=page.locator('.cell-fused-core')
        page.wait_for_function("document.querySelector('.cell-fused-core').dataset.stage==='join'",timeout=4000)
        page.emulate_media(reduced_motion='reduce')
        frozen_shape=fused.get_attribute('d')
        page.wait_for_timeout(250)
        assert fused.get_attribute('d')==frozen_shape, 'Reduced motion preserves the joined core instead of reverting it'
        page.emulate_media(reduced_motion='no-preference')
        assert fused.evaluate('n=>Number(getComputedStyle(n).opacity)')>.6, 'Continuous visible core during contact'
        assert fused.get_attribute('d').count('M ')==1, 'Nuclei share one contour after contact'
        colors=page.locator('#cell-core-mixture stop').evaluate_all('(nodes)=>nodes.map(n=>n.getAttribute("stop-color"))')
        assert colors[0]!=colors[1], 'Source pigments remain visible while joining'
        page.screenshot(path=f'/tmp/cells-fusion-{width}.png')
        page.wait_for_function("document.querySelector('.cell-fused-core').dataset.stage==='settle'",timeout=4000)
        assert fused.evaluate('n=>n.getBBox().width')>20, 'Core never collapses to a point'
        page.wait_for_function("document.querySelector('.light-cells').dataset.count==='5'",timeout=7000)
        merged_color=page.locator('.living-cell').last.locator('.cell-nucleus').evaluate('n=>getComputedStyle(n).backgroundColor')
        import re
        channels=[list(map(int,re.findall(r'\d+',color))) for color in source_colors]
        expected='rgb('+', '.join(str(int((a+b)/2+.5)) for a,b in zip(*channels))+')'
        assert merged_color==expected, (merged_color,expected)
        assert abs(page.locator('.living-cell').last.bounding_box()['width']-120) < 2, 'Fusion restores the combined area'
        # Stop motion via the system preference before inspecting a small colony.
        page.emulate_media(reduced_motion='reduce')
        page.locator('.living-cell').last.dispatch_event('click')
        page.wait_for_timeout(500)
        restored=page.locator('.living-cell').evaluate_all('(nodes)=>nodes.slice(-2).map(n=>getComputedStyle(n.querySelector(".cell-nucleus")).backgroundColor)')
        assert restored==source_colors, 'Division restores the actual pigments that merged'
        for _ in range(4): page.locator('.living-cell').last.dispatch_event('click')
        page.wait_for_timeout(500)
        page.screenshot(path=f'/tmp/living-cells-{width}.png')
        page.emulate_media(reduced_motion='no-preference')
        page.locator('#contact').scroll_into_view_if_needed()
        page.wait_for_timeout(200)
        frozen=page.locator('.living-cell').first.get_attribute('style')
        page.wait_for_timeout(300)
        assert page.locator('.living-cell').first.get_attribute('style')==frozen, 'Offscreen motion should stop'
        page.evaluate('scrollTo(0,0)')
        page.emulate_media(reduced_motion='reduce')
        page.wait_for_timeout(100)
        frozen=page.locator('.living-cell').first.get_attribute('style')
        page.wait_for_timeout(200)
        assert page.locator('.living-cell').first.get_attribute('style')==frozen
        assert not errors,errors
        page.close()
    browser.close()
print('Drift, collision fusion, offscreen suspend and reduced motion passed at 1440/375')
