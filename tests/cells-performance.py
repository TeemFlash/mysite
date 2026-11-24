"""Bounded rendering and isolation, without assuming hardware-specific FPS."""
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    browser=p.chromium.launch()
    page=browser.new_page(viewport={'width':1440,'height':900})
    page.add_init_script('Math.random = () => 0.37')
    page.goto('http://127.0.0.1:4173/experience/')
    page.locator('#record-control').click()
    page.wait_for_selector('body[data-state=scene]')
    page.locator('.light-cells').evaluate("el=>el.scrollIntoView({block:'center',behavior:'instant'})")
    page.emulate_media(reduced_motion='reduce')
    for _ in range(150):
        page.locator('.living-cell').last.dispatch_event('click')
    assert page.locator('.living-cell').count()==100
    page.wait_for_timeout(600)
    assert page.locator('.living-cell').evaluate_all('(nodes)=>nodes.every(n=>n.getAnimations({subtree:true}).length===0)')
    page.evaluate('''() => { window.stationaryChanges=0; const el=document.querySelector('.living-cell');
      window.cellObserver=new MutationObserver(records=>window.stationaryChanges+=records.length);
      cellObserver.observe(el,{attributes:true,subtree:true,childList:true}); }''')
    cell=page.locator('.living-cell').last
    rect=cell.bounding_box();x=rect['x']+rect['width']/2;y=rect['y']+rect['height']/2
    field=page.locator('.light-cells').bounding_box()
    dx=140 if x<field['x']+field['width']/2 else -140
    dy=60 if y<field['y']+field['height']/2 else -60
    page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+dx,y+dy,steps=60);page.mouse.up()
    page.wait_for_timeout(100)
    assert page.evaluate('stationaryChanges')==0, 'Moving one cell must not update stationary cells'
    assert page.locator('.living-cell').count()==100
    assert abs(cell.bounding_box()['x']-rect['x']-dx)<2
    page.evaluate('cellObserver.disconnect()')
    browser.close()
print('150 divisions: capped at 100; reduced-motion animations stop; stationary cells untouched during drag')
