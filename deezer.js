const fs = require('fs');
const axios = require('axios');
const admin = require('firebase-admin');

// CONFIG
const firebaseConfig = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(firebaseConfig),
  databaseURL: 'https://karaoke-b9ea7-default-rtdb.firebaseio.com' // <- substitua com a sua URL do Firebase
});

const db = admin.database();
const data = JSON.parse(fs.readFileSync('karaoke.json', 'utf8'));

// 🔍 Buscar dados no Deezer
async function buscarInfo(nomeCompleto) {
  const [artista, ...resto] = nomeCompleto.split(' - ');
  const musica = resto.join(' ') || artista;

  const urlBusca = `https://api.deezer.com/search?q=artist:"${encodeURIComponent(artista)}" track:"${encodeURIComponent(musica)}"`;

  try {
    const res = await axios.get(urlBusca);
    const faixa = res.data.data?.[0];
    if (!faixa) throw new Error('Música não encontrada');

    const albumId = faixa.album.id;
    const resAlbum = await axios.get(`https://api.deezer.com/album/${albumId}`);
    const album = resAlbum.data;

    return {
      artista: faixa.artist.name,
      musica: faixa.title,
      album: album.title,
      genero: album.genres?.data?.[0]?.name || 'desconhecido',
      imagemArtista: faixa.artist.picture_xl || faixa.artist.picture_big || '',
      imagemAlbum: album.cover_xl || album.cover_big || ''
    };
  } catch (e) {
    console.warn(`⚠️ Erro com "${nomeCompleto}": ${e.message}`);
    return {
      artista,
      musica,
      album: 'desconhecido',
      genero: 'desconhecido',
      imagemArtista: '',
      imagemAlbum: ''
    };
  }
}

// 🚀 Processar músicas
async function processar() {
  for (const entrada of data) {
    const nomeCompleto = entrada.nome;
    const arquivo = entrada.arquivo;

    const info = await buscarInfo(nomeCompleto);

    const novaEntrada = {
      nome: nomeCompleto,
      arquivo,
      artista: info.artista,
      musica: info.musica,
      genero: info.genero,
      album: info.album,
      imagemArtista: info.imagemArtista,
      imagemAlbum: info.imagemAlbum
    };

// Verifica se dados essenciais foram encontrados
    if (info.album === 'desconhecido' && !info.imagemArtista && !info.imagemAlbum) {
      console.warn(`❌ Ignorado: ${nomeCompleto} (informações incompletas)`);
      continue;
    }
    await db.ref('musicas').push(novaEntrada);
    console.log(`✔️ Adicionado: ${info.artista} - ${info.musica}`);
  }

  console.log('🎉 Finalizado!');
}

processar();