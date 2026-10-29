import json, math, os, random
random.seed(7)
# (id, person, lat, lon, muni, ward, species, cat, date, crop, area_ha, loss, status, photos, desc)
R=[
("HWC-001","Ram Bahadur Rai",26.6012,87.9360,"Kankai",3,"Asian Elephant","Crop Damage","2024-09-14","Paddy",0.62,148000,"Pending",3,"Herd of about 12 elephants trampled mature paddy overnight."),
("HWC-002","Sita Devi Subedi",26.6480,88.1190,"Mechinagar",7,"Asian Elephant","Crop Damage","2025-10-02","Maize",0.41,96000,"Compensation Paid",2,"Night raid from the Mechi river-side forest edge."),
("HWC-003","Dil Maya Limbu",26.6150,87.7850,"Shivasatakshi",5,"Asian Elephant","Property Damage","2023-11-21","",0,210000,"Compensation Paid",2,"Granary and boundary wall damaged by a single bull."),
("HWC-004","Hari Prasad Khanal",26.5560,87.9710,"Buddhashanti",2,"Asian Elephant","Death","2022-08-30","",0,500000,"Compensation Paid",1,"Fatal encounter while returning home after dusk."),
("HWC-005","Kamala Tamang",26.6320,87.8790,"Gauradaha",9,"Leopard","Livestock Depredation","2025-03-11","",0,38000,"Under Review",2,"Two goats taken from an open shed."),
("HWC-006","Bishnu Maya Gurung",26.5870,87.9010,"Arjundhara",4,"Leopard","Human Injury","2024-02-06","",0,85000,"Compensation Paid",1,"Farmer injured while cutting fodder near a forest patch."),
("HWC-007","Prem Kumar Oli",26.6640,87.7030,"Damak",11,"Leopard","Livestock Depredation","2026-01-19","",0,52000,"Pending",2,"A calf killed in a cattle shed at the settlement edge."),
("HWC-008","Gita Rajbanshi",26.6410,87.9920,"Birtamod",6,"Rhesus Monkey","Crop Damage","2025-06-25","Vegetables",0.18,42000,"Not Reported",2,"Troop raided a vegetable plot over several mornings."),
("HWC-009","Mohan Chhetri",26.6200,88.0500,"Mechinagar",12,"Rhesus Monkey","Crop Damage","2026-04-08","Banana",0.27,67000,"Under Review",2,"Banana grove stripped by a large troop."),
("HWC-010","Laxmi Adhikari",26.5700,87.8300,"Shivasatakshi",8,"Rhesus Monkey","Property Damage","2024-12-03","",0,18000,"Not Reported",1,"Roof sheets and water tank damaged."),
("HWC-011","Dhan Bahadur Magar",26.5960,87.9500,"Kankai",1,"Wild Boar","Crop Damage","2023-07-17","Paddy",0.35,74000,"Pending",2,"Seedbeds rooted up repeatedly."),
("HWC-012","Sunita Karki",26.6050,87.8450,"Gauradaha",3,"Asian Elephant","Crop Damage","2026-02-13","Sugarcane",0.88,226000,"Under Review",3,"Cane field flattened; electric fence was out of order."),
("HWC-013","Tek Bahadur Thapa",26.5400,87.9300,"Buddhashanti",7,"Asian Elephant","Human Injury","2025-09-05","",0,120000,"Compensation Paid",1,"Injured while guarding a field at night."),
("HWC-014","Rita Bhujel",26.6550,88.0100,"Birtamod",2,"Leopard","Livestock Depredation","2024-05-28","",0,29000,"Compensation Paid",1,"Dog and two hens killed near the home."),
("HWC-015","Narayan Dahal",26.6300,87.7500,"Damak",5,"Asian Elephant","Crop Damage","2023-10-09","Maize",0.53,118000,"Compensation Paid",2,"Elephants crossed the canal into maize fields."),
]
SC=["#c9d8c5","#d9cfa8","#bcd1d6","#d8bfae"]
def ring(lat,lon,ha):
    w=ha*10000; a=math.sqrt(w)*random.uniform(.8,1.25); b=w/a
    pts=[(-a/2,-b/2),(a/2,-b/2*random.uniform(.8,1.1)),(a/2*random.uniform(.85,1.1),b/2),(-a/2*random.uniform(.85,1.1),b/2*random.uniform(.9,1.1))]
    ll=[(lon+x/(111320*math.cos(math.radians(lat))),lat+y/110574) for x,y in pts]
    return ll+[ll[0]]
def area(r,lat):
    k=111320; s=0
    for (x1,y1),(x2,y2) in zip(r,r[1:]):
        s+=(x1*k*math.cos(math.radians(lat)))*(y2*k)-(x2*k*math.cos(math.radians(lat)))*(y1*k)
    return abs(s)/2/10000
inc=[];pts=[];pol=[]
for (i,p,la,lo,m,w,sp,cat,d,crop,ha,loss,st,np_,desc) in R:
    os.makedirs(f"photos/{i}",exist_ok=True); ph=[]
    for n in range(1,np_+1):
        f=f"photos/{i}/{n}.svg"
        open(f,"w").write(f'<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420"><rect width="100%" height="100%" fill="{SC[(n+len(i))%4]}"/><path d="M0 300 Q160 250 320 300 T640 290 V420 H0Z" fill="#7fa37a" opacity=".6"/><text x="50%" y="46%" font-family="Arial" font-size="30" fill="#1E293B" text-anchor="middle">{i} · photo {n}</text><text x="50%" y="56%" font-family="Arial" font-size="18" fill="#475569" text-anchor="middle">{sp} · {cat}</text><text x="50%" y="92%" font-family="Arial" font-size="14" fill="#475569" text-anchor="middle">Sample placeholder (fictional) - replace with field photo</text></svg>')
        ph.append(f)
    ar=0
    if ha>0:
        r=ring(la,lo,ha); ar=round(area(r,la),2)
        pol.append({"type":"Feature","properties":{"incident_id":i},"geometry":{"type":"Polygon","coordinates":[[list(map(lambda v:round(v,6),c)) for c in r]]}})
    inc.append({"incident_id":i,"affected_person":p,"municipality":m,"ward":w,"species":sp,"wildlife_group":{"Asian Elephant":"Elephant","Leopard":"Leopard","Rhesus Monkey":"Monkey"}.get(sp,"Other"),"damage_category":cat,"policy_number":f"JH-HWC-{d[:4]}-{i[-3:]}","incident_date":d,"crop":crop or None,"area_damaged_ha":ar,"economic_loss_npr":loss,"mitigation_status":st,"photos":ph,"description":desc,"is_sample_data":True})
    pts.append({"type":"Feature","properties":{"incident_id":i},"geometry":{"type":"Point","coordinates":[lo,la]}})
json.dump(inc,open("data/incidents.json","w"),indent=1,ensure_ascii=False)
json.dump({"type":"FeatureCollection","features":pts},open("data/conflict_points.geojson","w"),indent=1)
print(len(inc),len(pol))
