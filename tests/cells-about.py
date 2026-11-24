"""Default cells stay in About; manually moved cells can live across the page."""
from math import cos, sin
from playwright.sync_api import sync_playwright, expect


def bounded(page, excluded=()):
    return page.locator('.light-cells').evaluate('''(field,excluded) => {
        const box=field.getBoundingClientRect();
        return [...field.querySelectorAll('.living-cell')].every(cell=>{
            if(excluded.includes(cell.dataset.cellId))return true;
            const r=cell.getBoundingClientRect();
            return r.left>=box.left-1 && r.right<=box.right+1 &&
                r.top>=box.top-1 && r.bottom<=box.bottom+1;
        });
    }''',list(excluded))


def inside(cell):
    return cell.evaluate('''cell=>{
        const r=cell.getBoundingClientRect(),f=cell.parentElement.getBoundingClientRect();
        return r.left>=f.left-1&&r.right<=f.right+1&&r.top>=f.top-1&&r.bottom<=f.bottom+1;
    }''')


def outside(cell, side, margin=0):
    return cell.evaluate('''(cell,[side,margin])=>{
        const r=cell.getBoundingClientRect(),f=cell.parentElement.getBoundingClientRect();
        return side==='above'?r.bottom<f.top-margin:r.top>f.bottom+margin;
    }''',[side,margin])


def absent_from_viewport(page):
    return page.locator('.living-cell').evaluate_all('''cells=>cells.every(cell=>{
        const r=cell.getBoundingClientRect();return r.bottom<=0||r.top>=innerHeight;
    })''')


def drag(page,cell,x,y):
    box=cell.bounding_box()
    page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2)
    page.mouse.down()
    page.mouse.move(x,y,steps=8)
    page.mouse.up()


def horizontal_bounds(page):
    return page.locator('.living-cell').evaluate_all('''cells=>
        document.documentElement.scrollWidth<=innerWidth && cells.every(cell=>{
            const r=cell.getBoundingClientRect();return r.left>=-1&&r.right<=innerWidth+1;
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
        assert absent_from_viewport(page), 'The hero has no default cells'
        for section in ('skills','contact'):
            page.locator('#'+section).evaluate("el=>el.scrollIntoView({block:'start',behavior:'instant'})")
            assert absent_from_viewport(page), section+' must not show default cells'
        field.evaluate("el=>el.scrollIntoView({block:'center',behavior:'instant'})")
        assert bounded(page), 'Initial cells fit the field'

        # Cell 1 initially drifts left/down: exercise both boundaries, not just the center.
        cell=page.locator('[data-cell-id="1"]')
        box=field.bounding_box()
        radius=cell.bounding_box()['width']/2
        drag(page,cell,box['x']+radius+.5,box['y']+box['height']-radius-.5)
        assert bounded(page), 'A cell positioned inside the field stays confined'
        before=cell.bounding_box()
        page.emulate_media(reduced_motion='no-preference')
        page.wait_for_timeout(800)
        assert bounded(page), 'Autonomous drift must respect field edges'
        after=cell.bounding_box()
        assert abs(after['x']-before['x'])+abs(after['y']-before['y'])>.1, 'Animation ran'

        cell=page.locator('.living-cell').last
        moved_id=cell.get_attribute('data-cell-id')
        cell=page.locator('[data-cell-id="'+moved_id+'"]')
        for side in ('above','below'):
            field.evaluate("el=>el.scrollIntoView({block:'center',behavior:'instant'})")
            box=field.bounding_box()
            y=box['y']-170 if side=='above' else box['y']+box['height']+170
            drag(page,cell,width/2,y)
            assert outside(cell,side), str(width)+'px: Pointer movement can escape '+side+' the field'
            assert cell.evaluate('''cell=>{
                const r=cell.getBoundingClientRect();
                return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('.living-cell')===cell;
            }'''), 'An external cell remains visible and pointer-accessible'
            page.wait_for_timeout(750)
            assert outside(cell,side), 'Running animation must not snap a dragged cell back'
            assert bounded(page,[moved_id]), 'Untouched cells stay confined'

        cell.focus()
        for side,key in (('above','ArrowUp'),('below','ArrowDown')):
            for _ in range(100):
                if outside(cell,side,110):break
                page.keyboard.press(key)
            assert outside(cell,side,100), 'Keyboard movement can escape '+side+' the field'
            cell.evaluate("el=>el.scrollIntoView({block:'center',behavior:'instant'})")
            page.wait_for_timeout(750)
            assert outside(cell,side), (width,side,'Keyboard snap-back',cell.bounding_box(),field.bounding_box())

        page.emulate_media(reduced_motion='reduce')
        field.evaluate("el=>el.scrollIntoView({block:'center',behavior:'instant'})")
        box=field.bounding_box()
        radius=cell.bounding_box()['width']/2
        x=box['x']+radius+.2 if cos(int(moved_id)*2.4)<0 else box['x']+box['width']-radius-.2
        y=box['y']+radius+.2 if sin(int(moved_id)*2.4)<0 else box['y']+box['height']-radius-.2
        drag(page,cell,x,y)
        assert inside(cell), 'Manual reentry places the whole cell inside the field'
        page.emulate_media(reduced_motion='no-preference')
        page.wait_for_timeout(800)
        assert inside(cell), 'A manually returned cell becomes confined again'
        cell.focus()
        for _ in range(100):
            if outside(cell,'below',110):break
            page.keyboard.press('ArrowDown')
        assert outside(cell,'below',100), 'A returned cell can move outside again'
        cell.evaluate("el=>el.scrollIntoView({block:'center',behavior:'instant'})")

        before_ids=page.locator('.living-cell').evaluate_all('cells=>cells.map(c=>c.dataset.cellId)')
        box=cell.bounding_box()
        page.mouse.click(box['x']+box['width']/2,box['y']+box['height']/2)
        expect(cell).to_have_count(0)
        daughter_ids=page.locator('.living-cell').evaluate_all('''(cells,old)=>
            cells.map(c=>c.dataset.cellId).filter(id=>!old.includes(id))''',before_ids)
        assert len(daughter_ids)==2, 'Division produces two daughters'
        page.wait_for_timeout(2500)
        for cell_id in daughter_ids:
            assert outside(page.locator('[data-cell-id="'+cell_id+'"]'),'below'), 'Daughters stay at the external location after the division animation'
        assert bounded(page,daughter_ids), 'Default cells stay confined after external division'

        for resized_width in (320,1440,375,width):
            page.set_viewport_size({'width':resized_width,'height':900})
            page.wait_for_timeout(100)
            assert horizontal_bounds(page), 'Cells stay inside page edges after resize to '+str(resized_width)
        assert not errors,errors
        print(str(width)+'px passed',flush=True)
        page.close()
    browser.close()
print('Default isolation/drift, pointer and keyboard escape, external division, resize bounds: 1440/375/320 passed')
