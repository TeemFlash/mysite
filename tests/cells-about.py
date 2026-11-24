"""Cells stay in About, including drag/division at each field edge."""
from playwright.sync_api import sync_playwright, expect


def bounded(page):
    return page.locator('.light-cells').evaluate('''field => {
        const box=field.getBoundingClientRect();
        return [...field.querySelectorAll('.living-cell')].every(cell=>{
            const r=cell.getBoundingClientRect();
            return r.left>=box.left-1 && r.right<=box.right+1 &&
                r.top>=box.top-1 && r.bottom<=box.bottom+1;
        });
    }''')


def absent_from_viewport(page):
    return page.locator('.living-cell').evaluate_all('''cells=>cells.every(cell=>{
        const r=cell.getBoundingClientRect();return r.bottom<=0||r.top>=innerHeight;
    })''')


with sync_playwright() as p:
    browser=p.chromium.launch()
    for width in (1440,375,320):
        page=browser.new_page(viewport={'width':width,'height':900},reduced_motion='reduce')
        errors=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        page.goto('http://127.0.0.1:4173/experience/')
        page.locator('#record-control').click()
        page.wait_for_selector('body[data-state=scene]')
        field=page.locator('#about .light-cells')
        expect(field).to_have_attribute('data-count','5')
        assert page.locator('.light-cells').count()==1
        assert absent_from_viewport(page), 'The hero has no cells'
        for section in ('skills','contact'):
            page.locator('#'+section).evaluate("el=>el.scrollIntoView({block:'start',behavior:'instant'})")
            assert absent_from_viewport(page), section+' must not show cells'
        field.evaluate("el=>el.scrollIntoView({block:'center',behavior:'instant'})")
        assert bounded(page), 'Initial cells fit the field'
        for x,y in ((-200,-200),(width+200,-200),(width+200,1100),(-200,1100)):
            cell=page.locator('.living-cell').last
            box=cell.bounding_box()
            page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2)
            page.mouse.down();page.mouse.move(x,y,steps=8);page.mouse.up()
            assert bounded(page), 'Dragging must clamp every edge to About'
            cell.dispatch_event('click')
            assert bounded(page), 'Daughters must stay in About at every edge'
        cell=page.locator('.living-cell').last
        cell.focus()
        for key in ('ArrowLeft','ArrowUp','ArrowRight','ArrowDown'):
            for _ in range(40):page.keyboard.press(key)
            assert bounded(page), 'Keyboard movement must stay in About'
        page.emulate_media(reduced_motion='no-preference')
        field.evaluate("el=>el.scrollIntoView({block:'center',behavior:'instant'})")
        page.wait_for_timeout(600)
        assert bounded(page), 'Drifting cells must stay in About'
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        assert not errors,errors
        page.close()
    browser.close()
print('About-only cells, hero/Skills/Contact isolation, pointer/keyboard/division edges and overflow: 1440/375/320 passed')
