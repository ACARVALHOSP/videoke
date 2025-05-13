const db = firebase.database();
let playlist = [];
let playlistFiltrada = [];
let usuarioAtual = null;
let artistaSelecionado = null;
let generoSelecionado = null;
let artistas = new Map();
let generos = new Set();
let paginaAtual = 0;
const ARTISTAS_POR_PAGINA = 20;
// Validar nome do usuário
function validarNome() {
  const nome = document.getElementById('nome').value.trim().toLowerCase();
  if (nome === '') return;
  db.ref('usuarios/' + nome).once('value')
    .then(snapshot => {
      if (snapshot.exists()) {
        usuarioAtual = snapshot.val();
        document.getElementById('areaPedido').style.display = 'block';
        document.getElementById('erro').innerText = '';
		document.getElementById('login-area').style.display = 'none';
        const info = document.getElementById('infoUsuario');
        info.innerText = `👤 ${usuarioAtual.nome} | 🎫 Créditos disponíveis: ${usuarioAtual.maxMusicas - usuarioAtual.musicasPedidas}`;
        console.log(usuarioAtual.nome);
      } else {
        usuarioAtual = null;
        document.getElementById('areaPedido').style.display = 'none';
        document.getElementById('erro').innerText = 'Nome não encontrado.';
      }
    });

}
function adicionarFila(index) {
  if (!usuarioAtual) {
    alert('Valide seu nome primeiro.');
    return;
  }
  if (usuarioAtual.musicasPedidas >= usuarioAtual.maxMusicas) {
    alert('Limite de músicas atingido.');
    return;
  }
  const musica = playlistFiltrada[index];
  db.ref('fila').push({
    arquivo: musica.arquivo,
    nome: musica.nome,
    cantor: usuarioAtual.nome
  });
  db.ref('usuarios/' + usuarioAtual.nome.toLowerCase())
    .update({ musicasPedidas: usuarioAtual.musicasPedidas + 1 });
  usuarioAtual.musicasPedidas++;
  document.getElementById('infoUsuario').innerText = `👤 ${usuarioAtual.nome} | 🎫 Créditos disponíveis: ${usuarioAtual.maxMusicas - usuarioAtual.musicasPedidas}`;
  alert("Música adicionada!");
}
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btnAnterior').addEventListener('click', () => {
    if (paginaAtual > 0) {
      paginaAtual--;
      criarBotoesArtistas();
    }
  });
  document.getElementById('btnProximo').addEventListener('click', () => {
    paginaAtual++;
    criarBotoesArtistas();
  });
  document.getElementById('validarNomeBtn').addEventListener('click', validarNome);

  // 👇 Adicione estes dois
  document.getElementById('btnArtista').addEventListener('click', () => {
    const div = document.getElementById('filtroArtistas');
    div.style.display = div.style.display === 'none' ? 'block' : 'none';
  });

  document.getElementById('btnGenero').addEventListener('click', () => {
    const div = document.getElementById('filtroGenero');
    div.style.display = div.style.display === 'none' ? 'block' : 'none';
  });
});

firebase.database().ref('musicas').once('value')
  .then(snapshot => {
    playlist = [];
    snapshot.forEach(child => {
      const musica = child.val();
      playlist.push(musica);
      generos.add(musica.genero);
      if (!artistas.has(musica.artista)) {
        artistas.set(musica.artista, musica.imagemArtista);
      }
    });
    playlistFiltrada = [];
    criarBotoesGenero();
    criarBotoesArtistas();
  });

function criarBotoesGenero() {
  const container = document.getElementById('filtroGeneroContainer');
  container.innerHTML = '';
  Array.from(generos).sort().forEach(genero => {
    const btn = document.createElement('button');
    btn.innerText = genero;
    btn.className = 'genero-btn';
    btn.onclick = () => {
      generoSelecionado = genero;
      aplicarFiltros();
    };
    container.appendChild(btn);
  });
}

function criarBotoesArtistas() {
  const container = document.getElementById('gridArtistas');
  container.innerHTML = '';

  const artistasOrdenados = [...artistas.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const totalPaginas = Math.ceil(artistasOrdenados.length / ARTISTAS_POR_PAGINA);
  const inicio = paginaAtual * ARTISTAS_POR_PAGINA;
  const pagina = artistasOrdenados.slice(inicio, inicio + ARTISTAS_POR_PAGINA);

  pagina.forEach(([nome, imagem]) => {
    const btn = document.createElement('button');
    btn.className = 'artista-btn';
    btn.innerHTML = `<img src="${imagem}" alt="${nome}"><br>${nome}`;
    btn.onclick = () => {
      artistaSelecionado = nome;
      aplicarFiltros();
    };
    container.appendChild(btn);
  });

  document.getElementById('btnAnterior').disabled = paginaAtual === 0;
  document.getElementById('btnProximo').disabled = paginaAtual >= totalPaginas - 1;
}

function aplicarFiltros() {
  playlistFiltrada = playlist.filter(musica => {
    const matchGenero = !generoSelecionado || musica.genero === generoSelecionado;
    const matchArtista = !artistaSelecionado || musica.artista === artistaSelecionado;
    return matchGenero && matchArtista;
  });
  document.getElementById("artistaSelecionado").textContent = artistaSelecionado ? artistaSelecionado : "Todos os artistas";
  mostrarLista();
  console.log(artistaSelecionado);
}

function mostrarLista() {
const sidebar = document.getElementById('sidebarMusicas');
const lista = document.getElementById('listaMusicasSidebar');
lista.innerHTML = '';

if (playlistFiltrada.length === 0) {
  sidebar.style.display = 'none';
  return;
}

playlistFiltrada.forEach((musica, index) => {
  const li = document.createElement('li');
  li.innerHTML = `<button onclick="adicionarFila(${index})">${musica.nome}</button>`;
  lista.appendChild(li);
});

sidebar.style.display = '';


}
function fecharSidebar() {
  document.getElementById('sidebarMusicas').style.display = 'none';
  playlistFiltrada = [];
  artistaSelecionado = null;
  generoSelecionado = null;

  // Opcional: esconder visuais dos filtros se quiser resetar totalmente a interface
  document.getElementById('filtroGenero').style.display = 'none';
  document.getElementById('filtroArtistas').style.display = 'none';

  // Pode também resetar visualmente botões ou mensagens, se desejar
  document.getElementById('listaMusicasSidebar').innerHTML = '';
}
