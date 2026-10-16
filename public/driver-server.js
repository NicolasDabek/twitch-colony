// Pilote « serveur » : état via SSE, actions via /api/sim.
window.Driver={ send:e=>fetch('/api/sim',{method:'POST',body:JSON.stringify(e)}), start:cb=>{ new EventSource('/events').onmessage=m=>cb(JSON.parse(m.data)); } };
