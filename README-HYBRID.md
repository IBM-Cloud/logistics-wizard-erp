# Hybrid configuration to access a on-prem ERP service

The hybrid configuration introduces the Secure Gateway service to cross the on-prem boundaries.

![Architecture](http://g.gravizo.com/g?
  digraph G {
    node [fontname = "helvetica"]
    rankdir=BT
    others -> broker [label=" Call ERP service via broker"]
    broker -> sgw [label="Forwards calls"]
    sgw -> sgwclient [label="Reaches on-prem"]
    sgwclient -> erp [label="Calls the on-prem system"]
    {rank=same; broker -> sgw -> sgwclient -> erp [style=invis] }
    /* services on top */
    {rank=source; others }
    /* styling */
    broker [shape=rect label="ERP Service Broker"]
    erp [shape=rect label="ERP\\n[on-prem]"]
    sgw [shape=circle width=1.5 fixedsize=true style=filled color="%234E96DB" fontcolor=white label="Secure\\nGateway"]
    sgwclient [shape=circle width=1.5 fixedsize=true style=filled color="%234E96DB" fontcolor=white label="Secure\\nGateway\\nClient"]
    others [shape=rect style=filled color="%2324B643" fontcolor=white label="Other Services"]
  }
)

* The **ERP Service Broker** exposes the ERP Service API. It handles the connection with the Secure Gateway to reach the on-prem ERP service. To the outside world, the ERP Service Broker is just another ERP service.
* The **ERP** is sitting on-prem behind the Secure Gateway. It can be a real ERP system or the ERP simulator.

## Deploying the ERP Service Broker with the ERP Simulator

In this scenario, we deploy the ERP Service Broker as one Cloud Foundry application. The *on-prem* ERP is deployed as a Virtual Server. It runs the Secure Gateway client, an ERP simulator and a local database.

* (todo) how to expose an on-prem service outside of the enterprise
* (todo) how to configure the security settings of the Secure Gateway
