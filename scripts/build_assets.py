import bpy, math, os, random
from mathutils import Vector
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..'))
OUT=os.path.join(ROOT,'public','models')
os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
def mat(name,hex):
 m=bpy.data.materials.new(name);m.diffuse_color=tuple(((int(hex[i:i+2],16)/255+.055)/1.055)**2.4 for i in (0,2,4))+(1,);m.use_nodes=True;m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=m.diffuse_color;m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.88;return m
skin=mat('Skin','B7936C');shirt=mat('Jacket','C47546');hair=mat('Hair','40372E');white=mat('Eyes','EEE7CE');black=mat('Pupils','151622');pants=mat('Trousers','292C41');paper=mat('Paper','DDD5B6');wood=mat('DeskWood','826245');teal=mat('Enamel','394263');metal=mat('Metal','252735');screen=mat('Screen','7B98DF');lamp=mat('Lamp','D1A35A')
pieces=[]
def cube(name,loc,scale,material,bevel=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(material)
 if bevel:
  mod=o.modifiers.new('Cut corners','BEVEL');mod.width=bevel;mod.segments=1;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 return o
def ico(name,loc,scale,material,sub=1):
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub,radius=1,location=loc);o=bpy.context.object;o.name=name;o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(material);return o
def limb(name,a,b,r,material):
 direction=Vector(b)-Vector(a);bpy.ops.mesh.primitive_cone_add(vertices=6,radius1=r,radius2=r*.82,depth=direction.length,location=(Vector(a)+Vector(b))/2);o=bpy.context.object;o.name=name;o.rotation_euler=direction.to_track_quat('Z','Y').to_euler();o.data.materials.append(material);return o
def join(objs,name):
 bpy.ops.object.select_all(action='DESELECT')
 for o in objs:o.select_set(True)
 for ob in objs:
  colors=ob.data.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='CORNER')
  for poly in ob.data.polygons:
   rgba=ob.data.materials[poly.material_index].diffuse_color
   for idx in poly.loop_indices:colors.data[idx].color=rgba
 bpy.context.view_layer.objects.active=objs[0];bpy.ops.object.join();o=bpy.context.object;o.name=name
 material=bpy.data.materials.get('VertexPalette')
 if not material:
  material=bpy.data.materials.new('VertexPalette');material.use_nodes=True
  nodes=material.node_tree.nodes;vc=nodes.new('ShaderNodeVertexColor');vc.layer_name='Color'
  material.node_tree.links.new(vc.outputs['Color'],nodes['Principled BSDF'].inputs['Base Color'])
  nodes['Principled BSDF'].inputs['Roughness'].default_value=.88
 o.data.materials.clear();o.data.materials.append(material)
 for poly in o.data.polygons:poly.material_index=0
 return o
# Z-up Blender, exported as Y-up glTF. Character faces -Y.
parts=[]
def add(o,bone):parts.append((o,bone));return o
add(ico('Angular torso',(0,0,1.0),(.29,.19,.37),shirt,2),'spine')
add(cube('Cream shirtfront',(0,-.172,1.10),(.20,.036,.30),paper),'spine')
# Tapered silk blade, separate knot, and a visible gap from the shirt.
tie=mat('Cobalt silk','294CFF')
verts=[(-.026,-.218,1.18),(.026,-.218,1.18),(.042,-.222,.975),(0,-.226,.93),(-.042,-.222,.975)]
mesh=bpy.data.meshes.new('Tie blade mesh');mesh.from_pydata(verts,[],[(0,1,2,3,4)]);mesh.materials.append(tie)
blade=bpy.data.objects.new('Tapered necktie',mesh);bpy.context.collection.objects.link(blade)
solid=blade.modifiers.new('Silk thickness','SOLIDIFY');solid.thickness=.012;bpy.context.view_layer.objects.active=blade;bpy.ops.object.modifier_apply(modifier=solid.name);add(blade,'spine')
add(ico('Tie knot',(0,-.222,1.205),(.040,.023,.039),tie,1),'spine')
add(ico('Long faceted head',(0,0,1.63),(.22,.18,.34),skin,2),'head')
add(ico('Side swept hair',(0,.025,1.91),(.23,.18,.12),hair,1),'head')
for x in [-.112,.112]:
 add(ico('Big eye',(x,-.172,1.70),(.10,.072,.103),white,1),'head')
 add(ico('Pupil',(x+.012,-.237,1.70),(.035,.025,.04),black,1),'head')
add(ico('Nose',(0,-.197,1.56),(.055,.088,.11),skin,1),'head')
add(cube('Uneasy mouth',(0,-.173,1.43),(.125,.025,.025),black),'mouth')
for sign,label in [(-1,'L'),(1,'R')]:
 shoulder=(sign*.27,0,1.23);elbow=(sign*.40,-.035,.96);hand=(sign*.40,-.30,.93)
 add(limb('Sleeve',shoulder,elbow,.105,shirt),'arm.'+label)
 add(limb('Forearm',elbow,hand,.075,skin),'forearm.'+label)
 add(ico('Mitten hand',hand,(.09,.085,.10),skin,1),'forearm.'+label)
 add(limb('Thigh',(sign*.15,0,.94),(sign*.15,0,.58),.115,pants),'leg.'+label)
 add(limb('Shin',(sign*.15,0,.58),(sign*.15,0,.08),.09,pants),'shin.'+label)
 add(cube('Shoe',(sign*.15,-.07,.07),(.19,.29,.12),black,.025),'shin.'+label)
add(cube('Handset in hand',(.40,-.30,.97),(.055,.16,.045),black,.015),'receiver')
for ob,b in parts:
 if not b.startswith(('leg.','shin.')):ob.location.z+=.36
add(ico('Trouser waist',(0,0,.94),(.24,.17,.16),pants,1),'root')
bpy.ops.object.armature_add(location=(0,0,0));rig=bpy.context.object;rig.name='AnalystRig';bpy.ops.object.mode_set(mode='EDIT');rig.data.edit_bones.remove(rig.data.edit_bones[0])
bones={}
def bone(name,a,b,parent=None):
 if name!='root' and not name.startswith(('leg.','shin.')):a=(a[0],a[1],a[2]+.36);b=(b[0],b[1],b[2]+.36)
 v=rig.data.edit_bones.new(name);v.head=a;v.tail=b
 if parent:v.parent=bones[parent]
 bones[name]=v
bone('root',(0,0,0),(0,0,.65))
bone('spine',(0,0,.65),(0,0,1.30),'root');bone('head',(0,0,1.30),(0,0,1.96),'spine');bone('mouth',(0,-.173,1.43),(0,-.173,1.46),'head')
for sign,label in [(-1,'L'),(1,'R')]:
 bone('arm.'+label,(sign*.27,0,1.23),(sign*.40,-.035,.96),'spine')
 bone('forearm.'+label,(sign*.40,-.035,.96),(sign*.40,-.30,.93),'arm.'+label)
 bone('leg.'+label,(sign*.15,0,.94),(sign*.15,0,.58),'root')
 bone('shin.'+label,(sign*.15,0,.58),(sign*.15,0,.08),'leg.'+label)
bone('receiver',(.40,-.30,.97),(.40,-.30,1.02),'forearm.R')
bpy.ops.object.mode_set(mode='OBJECT')
for o,b in parts:
 g=o.vertex_groups.new(name=b);g.add(list(range(len(o.data.vertices))),1,'REPLACE')
character=join([o for o,b in parts],'Analyst');mod=character.modifiers.new('Rig','ARMATURE');mod.object=rig;character.parent=rig
rig.animation_data_create()
for name in ['idle','phone','standYell','deskSlam','walk']:
 action=bpy.data.actions.new(name);rig.animation_data.action=action
 for frame in [1,9,17,25,33,41,49,57,65]:
  t=(frame-1)/64*math.pi*2
  for p in rig.pose.bones:p.rotation_mode='XYZ';p.rotation_euler=(0,0,0);p.location=(0,0,0);p.scale=(1,1,1)
  rig.pose.bones['spine'].rotation_euler.x=math.sin(t)*.025
  rig.pose.bones['head'].rotation_euler.z=math.sin(t)*.08
  rig.pose.bones['receiver'].scale=(1,1,1) if name=='phone' else (.001,.001,.001)
  if name in ['standYell','phone']:rig.pose.bones['mouth'].scale.z=1+4*abs(math.sin(t*2))
  # Root local Y is vertical. Walking uses straight legs; sitting bends both knees.
  if name not in ['walk','standYell']:
   rig.pose.bones['root'].location.y=-.36
   for label in ['L','R']:
    rig.pose.bones['leg.'+label].rotation_euler.x=-math.pi/2
    rig.pose.bones['shin.'+label].rotation_euler.x=math.pi/2
  if name=='idle':
   rig.pose.bones['forearm.L'].rotation_euler.x=.055*math.sin(t*2)
   rig.pose.bones['forearm.R'].rotation_euler.x=-.045*math.sin(t*2)
  if name=='phone':rig.pose.bones['arm.R'].rotation_euler.x=-1.5;rig.pose.bones['forearm.R'].rotation_euler.y=-.8;rig.pose.bones['head'].rotation_euler.y=.13
  if name=='standYell':
   rig.pose.bones['root'].location.y=.015*math.sin(t);rig.pose.bones['arm.L'].rotation_euler.y=1.5+.2*math.sin(t);rig.pose.bones['arm.R'].rotation_euler.y=-1.4
  if name=='deskSlam':
   rig.pose.bones['spine'].rotation_euler.x=.18*abs(math.sin(t));rig.pose.bones['arm.R'].rotation_euler.x=-.9*abs(math.sin(t))
  if name=='walk':
   rig.pose.bones['root'].location.y=.012*math.sin(t*2)
   for label,phase in [('L',t),('R',t+math.pi)]:
    rig.pose.bones['leg.'+label].rotation_euler.x=.28*math.sin(phase)
    rig.pose.bones['shin.'+label].rotation_euler.x=.40*max(0,-math.sin(phase))
    rig.pose.bones['arm.'+label].rotation_euler.x=-.18*math.sin(phase)
  for p in rig.pose.bones:p.keyframe_insert('rotation_euler',frame=frame);p.keyframe_insert('location',frame=frame);p.keyframe_insert('scale',frame=frame)
 track=rig.animation_data.nla_tracks.new();track.name=name;track.strips.new(name,1,action)
rig.animation_data.action=None
for tr in rig.animation_data.nla_tracks:tr.mute=True
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'analyst.blend'))
for tr in rig.animation_data.nla_tracks:tr.mute=False
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'analyst.glb'),export_format='GLB',export_animations=True,export_animation_mode='NLA_TRACKS')
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
# Compact original trading workstation, grouped into a few material draw calls.
props=[]
props.append(cube('Desk top',(0,0,.88),(1.62,.82,.10),wood,.045))
for x in [-.66,.66]:
 props.append(cube('Desk pedestal',(x,.04,.44),(.25,.66,.82),teal,.025))
 for z in [.36,.60]:props.append(cube('Drawer handle',(x,-.30,z),(.12,.035,.022),lamp))
angle=.24
half_gap=.31*math.cos(angle)+.008
for x,angle in [(-half_gap,angle),(half_gap,-angle)]:
 props.append(cube('Monitor foot',(x,.20,.97),(.28,.20,.055),metal))
 props.append(cube('Monitor neck',(x,.25,1.12),(.065,.065,.29),metal))
 panels=[cube('Monitor shell',(x,.23,1.31),(.62,.085,.39),metal,.025),
         cube('Monitor glass',(x,.179,1.31),(.54,.012,.31),screen)]
 for n in range(5):
  panels.append(cube('Chart bar',(x-.20+n*.087,.166,1.25+n%3*.035),(.045,.014,.07+n%3*.035),lamp if n%3==0 else paper))
 for panel in panels:
  px,py=panel.location.x-x,panel.location.y-.23
  panel.location.x=x+px*math.cos(angle)-py*math.sin(angle)
  panel.location.y=.23+px*math.sin(angle)+py*math.cos(angle)
  panel.rotation_euler.z+=angle
  props.append(panel)
props.append(cube('Keyboard',(-.08,-.23,.96),(.57,.20,.025),metal,.01))
props.append(cube('Telephone',(.61,-.23,.98),(.23,.22,.10),teal,.035))
props.append(cube('Receiver',(.61,-.23,1.055),(.27,.09,.055),black,.02))
props.append(cube('Notepad',(-.56,-.21,.95),(.24,.28,.015),paper))
props.append(cube('Chair seat',(0,-.76,.52),(.52,.48,.12),teal,.05))
props.append(cube('Chair back',(0,-.96,.85),(.54,.10,.58),teal,.05))
props.append(limb('Chair stem',(0,-.76,.08),(0,-.76,.50),.065,metal))
for i in range(4):
 a=i*math.pi/2;props.append(limb('Chair base',(0,-.76,.08),(.29*math.cos(a),-.76+.29*math.sin(a),.06),.035,metal))
# Papers, coffee and a coiled phone cord belong to every workstation.
for k in range(3):
 o=cube('Loose trade slip',(-.58+k*.045,-.03,.951+k*.006),(.24,.19,.006),paper);o.rotation_euler.z=-.16+k*.20;props.append(o)
for k in range(12):
 a=k*1.8;props.append(cube('Coiled phone cord',(.72+.018*math.cos(a),-.1+k*.014,.954),(.025,.019,.018),black))

join(props,'Workstation')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'workstation.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'workstation.glb'),export_format='GLB')
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
props=[]
floor=mat('Floor','A49C8F');wall=mat('Wall','282A39');window=mat('Window','889CC0');trim=mat('Brass','B59557')
props.append(cube('Floor slab',(0,0,-.12),(12.8,10.7,.24),floor,.08))
for x in range(-6,7):
 props.append(cube('Floor joint',(x,0,.005),(.015,10.5,.012),teal))
for y in range(-5,6):
 props.append(cube('Floor joint',(0,y,.005),(12.7,.015,.012),teal))
props.append(cube('Back wall',(0,5.2,1.55),(12.8,.18,3.2),wall))
props.append(cube('Left wall',(-6.3,0,.65),(.18,10.5,1.35),wall))
for x in [-5,-2.5,0,2.5,5]:
 props.append(cube('Tall window',(x,5.09,1.85),(2.1,.025,1.95),window))
 for dx in [-1.05,0,1.05]:props.append(cube('Window mullion',(x+dx,5.05,1.85),(.045,.045,1.98),metal))
props.append(cube('Boss office platform',(0,3.5,.06),(4.6,2.6,.12),wood))
for x in [-2.3,2.3]:
 for y in [2.2,4.8]:props.append(cube('Office frame',(x,y,1.35),(.045,.045,2.6),trim))
 props.append(cube('Office rail',(x,3.5,2.65),(.055,2.65,.055),trim))
props.append(cube('Office header',(0,2.2,2.65),(4.65,.06,.08),trim))
# Printer near entrance.
props.append(cube('Printer cabinet',(4.9,-3.9,.44),(.85,.8,.9),teal,.04))
props.append(cube('Ticket printer',(4.9,-3.9,1.0),(.74,.65,.30),paper,.045))
props.append(cube('Output slot',(4.9,-4.235,1.0),(.48,.035,.07),black))
props.append(cube('Printed ticket',(4.9,-4.34,.96),(.29,.22,.012),paper))
# Oversized quotation boards bring the room closer to an old trading floor.
for bx in [-4.3,0,4.3]:
 props.append(cube('Wall market board',(bx,4.98,2.42),(3.65,.12,1.0),metal,.025))
 for row in range(4):
  for col in range(12):
   h=.024+(col*7+row*3)%5*.009
   props.append(cube('Market quote light',(bx-1.58+col*.28,4.90,2.75-row*.21),(.16,.018,h),screen if (col+row)%3 else lamp))

# Low-poly plants.
for x,y in [(-5.6,4.4),(5.6,4.4),(-5.6,-4.4)]:
 bpy.ops.mesh.primitive_cone_add(vertices=7,radius1=.24,radius2=.34,depth=.48,location=(x,y,.24));o=bpy.context.object;o.data.materials.append(wood);props.append(o)
 for j in range(6):
  a=j*math.pi/3;props.append(ico('Angular leaves',(x+.18*math.cos(a),y+.18*math.sin(a),.80+j%2*.22),(.25,.23,.5),teal,1))
join(props,'TradingRoom')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'room.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'room.glb'),export_format='GLB')
print('THE FLOOR: original Blender assets exported')







# Separate reusable cup so the scene can tip and rescue it.
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
props=[]
bpy.ops.mesh.primitive_cylinder_add(vertices=10,radius=.061,depth=.12,location=(0,0,.06))
o=bpy.context.object;o.data.materials.append(paper);props.append(o)
bpy.ops.mesh.primitive_cylinder_add(vertices=10,radius=.052,depth=.005,location=(0,0,.122))
o=bpy.context.object;o.data.materials.append(hair);props.append(o)
bpy.ops.mesh.primitive_torus_add(major_segments=10,minor_segments=4,location=(.071,0,.066),rotation=(math.pi/2,0,0),major_radius=.033,minor_radius=.012)
o=bpy.context.object;o.data.materials.append(paper);props.append(o)
join(props,'CoffeeCup')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'coffee.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'coffee.glb'),export_format='GLB')
