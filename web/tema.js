// Aplica o tema salvo antes do primeiro desenho da página (evita piscar claro→escuro).
try{var t=localStorage.getItem('gpd:theme');if(t)document.documentElement.dataset.theme=t}catch(e){}
