"""Pointer regression checks with Chromium touch emulation and desktop input."""
from playwright.sync_api import sync_playwright, expect

with sync_playwright() as p:
    browser = p.chromium.launch()
    for width, touch in [(1440, False), (390, True), (320, True)]:
        page = browser.new_page(viewport={'width': width, 'height': 900}, has_touch=touch, is_mobile=touch, reduced_motion='reduce')
        errors=[]
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto('http://127.0.0.1:4173/experience/')
        page.locator('#record-control').click()
        page.wait_for_selector('body[data-state=scene]')
        field=page.locator('.light-cells')
        first=page.locator('.living-cell').first
        first.wait_for()
        title=page.locator('#intro-name').bounding_box()
        page.mouse.move(title['x']+5,title['y']+20)
        page.mouse.down()
        page.mouse.move(title['x']+title['width']-5,title['y']+50,steps=8)
        page.mouse.up()
        assert page.evaluate('String(getSelection())') == ''
        assert page.locator('img').first.evaluate("el => !el.dispatchEvent(new Event('dragstart',{bubbles:true,cancelable:true}))")
        box=first.bounding_box(); x=box['x']+box['width']/2; y=box['y']+box['height']/2
        if touch:
            cdp=page.context.new_cdp_session(page)
            for kind, points in [('touchStart',[{'x':x,'y':y}]),('touchMove',[{'x':x+60,'y':y+30}]),('touchEnd',[])]:
                cdp.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':points})
                page.wait_for_timeout(50)
        else:
            page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+60,y+30,steps=10);page.mouse.up()
        expect(field).to_have_attribute('data-count','5')
        assert abs(first.bounding_box()['x']-box['x']-60)<2
        assert page.evaluate('String(getSelection())') == ''
        (first.tap if touch else first.click)()
        expect(field).to_have_attribute('data-count','6')
        # A canceled touch must not divide, and the next tap must still work.
        if touch:
            box=page.locator('.living-cell').last.bounding_box()
            x=box['x']+box['width']/2;y=box['y']+box['height']/2
            cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
            cdp.send('Input.dispatchTouchEvent',{'type':'touchCancel','touchPoints':[]})
            expect(field).to_have_attribute('data-count','6')
            page.locator('.living-cell').last.tap()
            expect(field).to_have_attribute('data-count','7')
            page.wait_for_timeout(100)
            # Swipe empty space, not a cell: normal scrolling must remain available.
            for kind, points in [('touchStart',[{'x':width-10,'y':750}]),('touchMove',[{'x':width-10,'y':350}]),('touchEnd',[])]:
                cdp.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':points})
                page.wait_for_timeout(80)
            page.wait_for_function('scrollY > 100')
        else:
            cell=page.locator('.living-cell').first
            cell.focus()
            for _ in range(55): page.keyboard.press('ArrowRight')
            page.set_viewport_size({'width':320,'height':812})
            page.wait_for_timeout(150)
            assert page.locator('.living-cell').evaluate_all('(nodes)=>nodes.every(n=>{const r=n.getBoundingClientRect();return r.left>=-1&&r.right<=innerWidth+1})')
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        assert not errors,errors
        page.close()
    browser.close()
print('Selection, native drag, mouse/touch move, cancel, click, swipe and resize: passed')
