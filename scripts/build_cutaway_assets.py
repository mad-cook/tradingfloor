import os
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..'))
with open(os.path.join(ROOT,'scripts','build_assets.py')) as f:source=f.read()
exec(source.split('# Z-up Blender')[0])
# Simplified stage prop, no moving or mechanically detailed parts.
props=[cube('Stage prop block',(0,-.055,.025),(.065,.22,.065),metal,.012),cube('Stage prop grip',(0,.015,-.035),(.052,.055,.12),black,.008)]
join(props,'CutawayProp')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'cutaway-prop.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'cutaway-prop.glb'),export_format='GLB')
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
uniform=mat('Caretaker cap','91AFA1')
props=[cube('Caretaker cap',(0,.015,2.32),(.47,.35,.12),uniform,.035),cube('Cap visor',(0,-.19,2.28),(.42,.20,.035),uniform,.018),cube('Work apron',(0,-.205,1.23),(.32,.028,.45),paper,.018)]
join(props,'CaretakerUniform')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'caretaker-kit.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'caretaker-kit.glb'),export_format='GLB')
