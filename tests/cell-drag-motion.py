"""Continuous drag keeps the simulation clock and unrelated morphs running."""
import math
from playwright.sync_api import sync_playwright, expect


def center(cell):
    return cell.evaluate('''node => {const r=node.getBoundingClientRect();
        return [r.x+r.width/2,r.y+r.height/2]}''')


def drag_stream(page, cell, duration=1800):
    cell=page.locator('[data-cell-id="'+cell.get_attribute('data-cell-id')+'"]')
    x, y = center(cell)
    dx = 90 if x < page.viewport_size['width'] / 2 else -90
    page.mouse.move(x, y)
    page.mouse.down()
    # A frame-aligned pointer stream exercises the high-frequency input which
    # previously cancelled the next simulation frame and reset its dt to zero.
    elapsed = page.evaluate('''async ({id,x,y,dx,duration}) => {
        const node=document.querySelector('[data-cell-id="'+id+'"]');
        const before=performance.now();
        await new Promise(resolve=>{
            let start;
            function move(now) {
                start??=now;const t=Math.min(1,(now-start)/duration);
                node.dispatchEvent(new PointerEvent('pointermove',{
                    bubbles:true,pointerId:1,isPrimary:true,buttons:1,
                    clientX:x+dx*t,clientY:y-60*t
                }));
                if(t<1)requestAnimationFrame(move);else requestAnimationFrame(resolve);
            }
            requestAnimationFrame(move);
        });
        return performance.now()-before;
    }''', {'id':cell.get_attribute('data-cell-id'),'x':x,'y':y,'dx':dx,'duration':duration})
    page.mouse.up()
    assert math.dist([x,y],center(cell)) > 60, 'The test must actually move the selected cell'
    return elapsed


def move_to(page, cell, x, y):
    source=center(cell)
    page.mouse.move(*source);page.mouse.down()
    page.mouse.move(x,y,steps=10);page.mouse.up()


def scene(browser, width, reduced=False):
    page=browser.new_page(viewport={'width':width,'height':900},
        reduced_motion='reduce' if reduced else 'no-preference')
    page.add_init_script('Math.random=()=>.37')
    page.goto('http://127.0.0.1:4173/experience/')
    page.locator('#record-control').click()
    page.wait_for_selector('body[data-state=scene]')
    page.locator('.light-cells').evaluate("el=>el.scrollIntoView({block:'center',behavior:'instant'})")
    expect(page.locator('.light-cells')).to_have_attribute('data-count','5')
    assert page.locator('.cell-motion-toggle').count()==0
    return page


with sync_playwright() as p:
    browser=p.chromium.launch()
    results=[]
    for width in (1440,375):
        page=scene(browser,width)
        page.locator('.living-cell').first.dispatch_event('click')
        page.locator('.cell-fusion').nth(1).wait_for(state='attached')
        page.locator('.cell-fusion').nth(1).wait_for(state='detached')
        page.wait_for_timeout(150)
        other=page.locator('.living-cell').nth(-2)
        selected=page.locator('.living-cell').last
        before=center(other);page.wait_for_timeout(800)
        baseline=math.dist(before,center(other))/.8
        before=center(other)
        elapsed=drag_stream(page,selected)
        distance=math.dist(before,center(other))
        assert distance>max(5,baseline*elapsed/1000*.4), (width,baseline,distance,elapsed)
        results.append({'width':width,'baseline_px_per_s':round(baseline,2),
            'drag_px':round(distance,2),'drag_ms':round(elapsed)})
        page.close()

        # A split belonging to another cell must keep unfolding during the drag.
        page=scene(browser,width)
        page.locator('.living-cell').first.dispatch_event('click')
        page.locator('.cell-fusion').nth(1).wait_for(state='attached')
        page.locator('.cell-fusion').nth(1).wait_for(state='detached')
        selected_id=page.locator('.living-cell').nth(-2).get_attribute('data-cell-id')
        selected=page.locator('[data-cell-id="'+selected_id+'"]')
        page.locator('.living-cell').last.dispatch_event('click')
        split=page.locator('.cell-fusion').nth(1)
        split.wait_for(state='attached')
        progress=float(split.get_attribute('data-progress'))
        drag_stream(page,selected,900)
        assert split.count()==0 or float(split.get_attribute('data-progress'))<progress-.25, 'Another division stalled during drag'
        page.close()

        # Preparing the collision under reduced motion avoids timing-dependent placement.
        page=scene(browser,width,True)
        page.locator('.living-cell').first.dispatch_event('click')
        page.locator('.living-cell').last.dispatch_event('click')
        cells=page.locator('.living-cell')
        selected=cells.nth(-3);a=cells.nth(-2);b=cells.last
        field=page.locator('.light-cells').bounding_box()
        move_to(page,selected,field['x']+field['width']*.72,field['y']+field['height']*.25)
        move_to(page,a,field['x']+field['width']*.45,field['y']+field['height']*.7)
        move_to(page,b,field['x']+field['width']*.45+20,field['y']+field['height']*.7)
        page.emulate_media(reduced_motion='no-preference')
        page.wait_for_function('''() => {const svg=document.querySelector('.cell-fusion');
            return Number(svg.style.opacity)>0 && Number(svg.dataset.progress)>.1}''',timeout=8000)
        morph=page.locator('.cell-fusion').first
        progress=float(morph.get_attribute('data-progress'))
        drag_stream(page,selected,900)
        assert cells.count()==6 or float(morph.get_attribute('data-progress'))>progress+.25, 'Another fusion was cancelled or stalled during drag'
        expect(page.locator('.light-cells')).to_have_attribute('data-count','6',timeout=4000)
        page.close()
    browser.close()

print('Continuous drag preserves drift, unrelated division and fusion at 1440/375:',results)
