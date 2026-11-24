from playwright.sync_api import sync_playwright, expect

with sync_playwright() as p:
    browser=p.chromium.launch()
    for width in (1440,375):
        page=browser.new_page(viewport={'width':width,'height':900},reduced_motion='reduce')
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto('http://127.0.0.1:4173/experience/')
        page.locator('#record-control').click()
        page.wait_for_selector('body[data-state=scene]')
        page.locator('.light-cells').evaluate("el=>el.scrollIntoView({block:'center',behavior:'instant'})")
        field=page.locator('.light-cells')
        expect(field).to_have_attribute('data-count','5')
        cells=page.locator('.living-cell')
        initial=cells.evaluate_all('(nodes)=>nodes.map(n=>{const r=n.getBoundingClientRect();return {id:n.dataset.cellId,x:r.x,y:r.y,w:r.width}})')
        assert field.evaluate("el=>el.closest('#about')!==null"), 'The colony belongs only to About'
        bounds=field.bounding_box()
        assert all(bounds['x']<=c['x'] and bounds['y']<=c['y'] and c['x']+c['w']<=bounds['x']+bounds['width'] and c['y']+c['w']<=bounds['y']+bounds['height'] for c in initial), 'All five seeds fit inside About'
        assert len({round(c['y']) for c in initial})>=3, 'Seeds have breathing room in both axes'
        parent_color=cells.first.locator('.cell-nucleus').evaluate('n=>getComputedStyle(n).color')
        cells.first.click()
        expect(field).to_have_attribute('data-count','6')
        assert abs(cells.last.bounding_box()['width']-92)<1, 'Division reduces only 8 percent'
        import re
        children=cells.evaluate_all('(nodes)=>nodes.slice(-2).map(n=>getComputedStyle(n.querySelector(".cell-nucleus")).color)')
        channels=[list(map(int,re.findall(r'\d+',color))) for color in children]
        parent_channels=list(map(int,re.findall(r'\d+',parent_color)))
        assert children[0]!=children[1], 'Daughter pigments separate'
        assert [(a+b)/2 for a,b in zip(*channels)]==parent_channels, 'Mixing daughters restores parent pigment'
        for old in initial[1:]:
            box=page.locator('[data-cell-id="'+old['id']+'"]').bounding_box()
            assert box['x']==old['x'] and box['y']==old['y'] and box['width']==old['w'], 'Other cells remain unchanged'
        for _ in range(150):cells.last.dispatch_event('click')
        expect(field).to_have_attribute('data-count','100')
        assert cells.count()==100
        widths=cells.evaluate_all('(nodes)=>nodes.map(n=>n.getBoundingClientRect().width)')
        assert min(widths)>=55.9, 'Cells never shrink to dots'
        oldest=cells.first.get_attribute('data-cell-id')
        cells.last.dispatch_event('click')
        assert page.locator('[data-cell-id="'+oldest+'"]').count()==0
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        assert page.locator('#theme-toggle').count()==0
        assert page.locator('.cell-motion-toggle').count()==0
        assert field.is_visible()
        assert page.locator('html').get_attribute('data-theme')!='dark'
        expect(field).to_have_attribute('data-count','100')
        assert not errors, errors
        page.close()
    browser.close()
print('Five seeds, independent sizes, slow division, 56px minimum, rolling cap and light-only scene passed at 1440/375')
