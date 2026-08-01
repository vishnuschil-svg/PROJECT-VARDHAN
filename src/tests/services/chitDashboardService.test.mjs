import test from "node:test";
import assert from "node:assert/strict";

class MemoryStorage { constructor(){this.data=new Map()} getItem(key){return this.data.get(key)??null} setItem(key,value){this.data.set(key,String(value))} removeItem(key){this.data.delete(key)} clear(){this.data.clear()} }
globalThis.window={localStorage:new MemoryStorage()};

const { GroupsRepository, MembersRepository, CollectionsRepository } = await import("../../repositories/chits/index.js");
const { getChitCommandDashboard } = await import("../../services/chitDashboardService.js");
const context={tenant_id:"dashboard-test",data_scope:"real_tenant",workspace_label:"Dashboard Test"};
const options={activeTenantContext:context};

test("dashboard trend and payment modes use actual tenant collections only",()=>{
  GroupsRepository.create({id:"dg1",chit_name:"Evidence Chit",chit_code:"E1",status:"active",monthly_amount:1000,total_members:2,today_collections:500,pending_collections:100},options);
  MembersRepository.create({id:"dm1",group_id:"dg1",chit_group_id:"dg1",member_name:"Member",member_number:"M1",status:"active"},options);
  CollectionsRepository.create({id:"dc1",group_id:"dg1",chit_group_id:"dg1",member_id:"dm1",paid_amount:300,pending_amount:100,payment_method:"Cash",payment_date:"2026-07-13"},options);
  CollectionsRepository.create({id:"dc2",group_id:"dg1",chit_group_id:"dg1",member_id:"dm1",paid_amount:200,pending_amount:0,payment_method:"UPI",payment_date:"2026-07-13"},options);
  const model=getChitCommandDashboard(context,new Date("2026-07-13T10:00:00Z"));
  assert.equal(model.monthlyCollection,500); assert.deepEqual(model.collectionTrend,[{date:"2026-07-13",label:"13",value:500}]);
  assert.equal(model.paymentModes.find(x=>x.name==="Cash").value,300); assert.equal(model.paymentModes.find(x=>x.name==="UPI").value,200);
  assert.equal(model.hasBusinessData,true); assert.ok(model.insights.every(x=>x.evidence));
});

test("empty dashboard does not fabricate chart values or activity",()=>{
  const model=getChitCommandDashboard({tenant_id:"empty-dashboard",data_scope:"real_tenant"},new Date("2026-07-13T10:00:00Z"));
  assert.equal(model.hasBusinessData,false); assert.deepEqual(model.collectionTrend,[]); assert.equal(model.monthlyCollection,0); assert.deepEqual(model.activities,[]); assert.deepEqual(model.insights,[]);
});
