import bpy, os, math, json
from mathutils import Vector
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..'))
bpy.ops.wm.open_mainfile(filepath=os.path.join(ROOT,'public/models/analyst.blend'))
rig=bpy.data.objects['AnalystRig']
for track in rig.animation_data.nla_tracks:track.mute=True
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16
scene.render.resolution_x=640;scene.render.resolution_y=800;scene.render.resolution_percentage=100
scene.world.color=(.35,.35,.35)
bpy.ops.object.camera_add(location=(2.7,-5.4,2.65));camera=bpy.context.object;camera.rotation_euler=(Vector((0,0,1.1))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=2.9;scene.camera=camera
for loc,power,size in [((2,-4,5),650,4),((-3,-1,3),450,3)]:
 bpy.ops.object.light_add(type='AREA',location=loc);light=bpy.context.object;light.data.energy=power;light.data.shape='DISK';light.data.size=size;light.rotation_euler=(Vector((0,0,1))-light.location).to_track_quat('-Z','Y').to_euler()
report={}
for name in ['idle','walk','standYell']:
 rig.animation_data.action=bpy.data.actions[name];scene.frame_set(1);bpy.context.view_layer.update()
 report[name]={n:[round(v,4) for v in (rig.matrix_world@rig.pose.bones[n].head)] for n in ['root','leg.L','shin.L']}
 scene.render.filepath=os.path.join(ROOT,'reports','character-'+name+'.png');bpy.ops.render.render(write_still=True)
assert report['walk']['leg.L'][2]>.9,report
assert .55<report['idle']['leg.L'][2]<.61,report
assert abs(report['walk']['shin.L'][1])<.01,report
with open(os.path.join(ROOT,'reports/rig-check.json'),'w') as f:json.dump(report,f,indent=2)
print('Upright and seated rig checks passed')
