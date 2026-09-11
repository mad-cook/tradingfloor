import os
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..'))
with open(os.path.join(ROOT,'scripts','build_assets.py')) as f:source=f.read()
exec(source.split('# Z-up Blender')[0])
# Simplified stage prop, no moving or mechanically detailed parts.
# Exaggerated low-poly pistol silhouette sized to read from the office camera.
slide=mat('Brushed gunmetal','8294A3')
props=[cube('Pistol slide',(0,-.13,.065),(.10,.43,.095),slide,.012),
 cube('Dark muzzle',(0,-.348,.065),(.075,.012,.058),black,.005),
 cube('Pistol frame',(0,-.095,.004),(.085,.30,.045),metal,.008),
 cube('Pistol grip',(0,.025,-.075),(.084,.11,.20),black,.015),
 cube('Grip heel',(0,.034,-.18),(.095,.13,.028),metal,.005),
 cube('Trigger guard bottom',(0,-.103,-.073),(.025,.13,.022),metal,.005),
 cube('Trigger guard front',(0,-.164,-.035),(.025,.025,.08),metal,.005)]
join(props,'CutawayProp')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'cutaway-prop.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'cutaway-prop.glb'),export_format='GLB')
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
uniform=mat('Caretaker cap','91AFA1')
props=[cube('Caretaker cap',(0,.015,2.32),(.47,.35,.12),uniform,.035),cube('Cap visor',(0,-.19,2.28),(.42,.20,.035),uniform,.018),cube('Work apron',(0,-.205,1.23),(.32,.028,.45),paper,.018)]
join(props,'CaretakerUniform')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'caretaker-kit.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'caretaker-kit.glb'),export_format='GLB')
