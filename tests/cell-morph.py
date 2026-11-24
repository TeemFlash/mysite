"""Forward/reverse morph endpoints use the same center, scale and nucleus texture."""
from playwright.sync_api import sync_playwright, expect


def place(page, cell, x, y):
    # Keyboard placement targets the requested cell even when membranes overlap.
    box=cell.bounding_box()
    cell.focus()
    for delta,negative,positive in ((x-box['x']-box['width']/2,'ArrowLeft','ArrowRight'),(y-box['y']-box['height']/2,'ArrowUp','ArrowDown')):
        for _ in range(round(abs(delta)/20)):
            page.keyboard.press(negative if delta<0 else positive)


def park_seeds(page):
    field=page.locator('.light-cells').bounding_box()
    for cell_id,x,y in ((2,44,44),(3,field['width']-49,49),(4,44,field['height']-44),(5,field['width']-49,field['height']-49)):
        place(page,page.locator(f'[data-cell-id="{cell_id}"]'),field['x']+x,field['y']+y)
    return field

with sync_playwright() as p:
    browser=p.chromium.launch()
    for width in (1440,375):
        page=browser.new_page(viewport={'width':width,'height':900})
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.add_init_script('Math.random=()=>.37')
        page.goto('http://127.0.0.1:4173/experience/')
        page.locator('#record-control').click()
        page.wait_for_selector('body[data-state=scene]')
        page.locator('.light-cells').evaluate("el=>el.scrollIntoView({block:'center',behavior:'instant'})")
        cells=page.locator('.living-cell');cells.first.wait_for()
        page.evaluate("""() => {
          window.exposedNuclei=[];window.splitEnd=null;let started=false;
          const field=document.querySelector('.light-cells');
          const watch=new MutationObserver(()=>{
            const svg=field.querySelectorAll('.cell-fusion')[1];
            if(!svg) {
              if(started&&!window.splitEnd) {
                const [a,b]=[...field.querySelectorAll('.living-cell')].slice(-2).map(n=>n.getBoundingClientRect());
                window.splitEnd={gap:Math.hypot(a.x-b.x,a.y-b.y),width:a.width};
              }
              return;
            }
            started=true;
            if(Number(svg.querySelector('.cell-fused-core').style.opacity)===0)return;
            const membranes=[...svg.querySelectorAll('.cell-membrane')].filter(n=>Number(n.style.opacity)>0);
            for(const image of svg.querySelectorAll('mask image')) {
              if(Number(image.style.opacity||1)<.2)continue;
              const x=Number(image.getAttribute('x')),y=Number(image.getAttribute('y'));
              const w=Number(image.getAttribute('width')),h=Number(image.getAttribute('height'));
              for(let i=0;i<24;i++) {
                const angle=i/24*Math.PI*2;
                const point=new DOMPoint(x+w/2+Math.cos(angle)*w*.375,y+h/2+Math.sin(angle)*h*.375).matrixTransform(image.transform.baseVal.consolidate()?.matrix??new DOMMatrix());
                if(!membranes.some(membrane=>membrane.isPointInFill(point)))
                  exposedNuclei.push(Number(svg.dataset.progress));
              }
            }
          });watch.observe(field,{childList:true,subtree:true,attributes:true,attributeFilter:['data-progress']});
        }""")
        cells.first.dispatch_event('click')
        expect(page.locator('.light-cells')).to_have_attribute('data-count','6')
        split=page.locator('.cell-fusion').nth(1)
        split.wait_for(state='attached')
        core=split.locator('.cell-fused-core')
        page.wait_for_function("[...document.querySelectorAll('.cell-fused-core')].at(-1).dataset.stage==='join'")
        assert core.get_attribute('d').count('M ')==1, 'Division starts from one joined nucleus'
        assert core.evaluate("n=>getComputedStyle(n).fill.includes('url(')"), 'Reverse nucleus must retain its colored gradient'
        page.emulate_media(reduced_motion='reduce')
        shape=core.get_attribute('d')
        page.wait_for_timeout(200)
        assert core.get_attribute('d')==shape, 'Reverse morph respects reduced motion'
        page.screenshot(path=f'/tmp/cell-splitting-{width}.png')
        page.emulate_media(reduced_motion='no-preference')
        page.wait_for_function("[...document.querySelectorAll('.cell-fused-core')].at(-1).dataset.stage==='approach'")
        assert core.get_attribute('d').count('M ')==2, 'One nucleus separates into two contours'
        split.wait_for(state='detached')
        assert page.evaluate('exposedNuclei')==[], 'Visible nuclei must stay inside the membrane throughout reversed fusion'
        page.wait_for_timeout(1400)
        assert cells.nth(-2).evaluate("n=>n.style.scale")=='' and cells.last.evaluate("n=>n.style.scale")=='' , 'Rebound must settle back to the original cell proportions'
        page.emulate_media(reduced_motion='reduce')
        a,b=cells.nth(-2).bounding_box(),cells.last.bounding_box()
        end=page.evaluate('splitEnd')
        assert end['width']*.9 < end['gap'] < end['width']*1.6, 'Membranes close and separate before returning to free drift'
        # Keep unrelated seeds away so this regression observes these two daughters.
        field=park_seeds(page)
        place(page,cells.nth(-2),field['x']+field['width']/2-10,field['y']+field['height']/2)
        place(page,cells.last,field['x']+field['width']/2+10,field['y']+field['height']/2)
        page.evaluate('''() => {
          window.handoff=[];let count=400;
          const sample=n=>{const r=n.getBoundingClientRect();return {cx:r.x+r.width/2,cy:r.y+r.height/2,w:r.width,mask:n.querySelector('.cell-nucleus').style.maskImage}};
          function tick(){const cells=[...document.querySelectorAll('.living-cell')];handoff.push({count:cells.length,a:sample(cells.at(-2)),b:sample(cells.at(-1))});if(--count)requestAnimationFrame(tick)}
          requestAnimationFrame(tick);
        }''')
        page.evaluate("""() => {
          const svg=document.querySelector('.cell-fusion');
          window.materialCheck=null;
          const watch=new MutationObserver(()=>{
            const t=Number(svg.dataset.progress);
            if(t<.96||t>=1)return;
            watch.disconnect();
            const a=[...document.querySelectorAll('.living-cell')].at(-2);
            const nucleus=a.querySelector('.cell-nucleus');
            const core=svg.querySelector('.cell-fused-core');
            const mask=svg.querySelector('mask');
            const texture=mask.querySelector('image');
            const membrane=svg.querySelector(':scope > path');
            const points=membrane.getAttribute('d').match(/-?\\d+(?:\\.\\d+)?/g).map(Number);
            const field=document.querySelector('.light-cells').getBoundingClientRect(), box=a.getBoundingClientRect();
            const cx=box.x+box.width/2-field.x,cy=box.y+box.height/2-field.y;
            const radii=[];for(let i=0;i<points.length;i+=2)radii.push(Math.hypot(points[i]-cx,points[i+1]-cy));
            window.materialCheck={
              textured: getComputedStyle(membrane).fill.includes('url(')&&!!svg.querySelector('pattern image').getAttribute('href'),
              sameMask: nucleus.style.maskImage.includes(texture.getAttribute('href')),
              maskWidth: Number(texture.getAttribute('width')),
              cellWidth: box.width,
              organic: Math.max(...radii)/Math.min(...radii),
              opacity: Number(getComputedStyle(core).opacity),
              blur: getComputedStyle(core).filter,
              staticOpacity: Number(getComputedStyle(nucleus).opacity)
            };
          });watch.observe(svg,{attributes:true,attributeFilter:['data-progress']});
        }""")
        page.emulate_media(reduced_motion='no-preference')
        page.wait_for_function("document.querySelector('.light-cells').dataset.count==='5'",timeout=9000)
        material=page.evaluate('materialCheck')
        assert material and material['textured'] and material['sameMask'],material
        assert material['organic']>1.09, 'The merging membrane must keep its lobes, not switch from a circle'
        assert abs(material['maskWidth']-material['cellWidth']*.4)<.3,material
        assert material['opacity']==.72 and material['staticOpacity']==0, 'No opacity dip from crossfading translucent copies'
        assert material['blur']=='none', 'The animated grain must not switch from a blurred disk'

        page.wait_for_timeout(100)
        result=page.evaluate('''()=>{const i=handoff.findIndex(s=>s.count===5);const a=handoff[i-1].a,b=handoff[i].b;return {distance:Math.hypot(a.cx-b.cx,a.cy-b.cy),size:Math.abs(a.w-b.w),mask:a.mask===b.mask}}''')
        assert result['distance']<2,result
        assert result['size']<1,result
        assert result['mask'], 'Merge endpoint must keep the same nucleus texture'
        assert not errors,errors
        page.close()
    browser.close()
print('Reverse liquid split, reduced motion and pixel-stable merge handoff passed at 1440/375')
