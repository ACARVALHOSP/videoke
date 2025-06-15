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
async function musicaExiste(artista, musica) {
  const snapshot = await db.ref('musicas')
    .orderByChild('chave')
    .equalTo(`${artista} - ${musica}`)
    .once('value');
  return snapshot.exists();
}
async function buscarInfo(artista,musica) {

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
    console.warn(`⚠️ Erro com "${artista}": ${e.message}`);
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
async function processar() {
  let contador = 0;




  for (const entrada of data) {
    const { artista, musica, arquivo } = entrada;

    const info = await buscarInfo(artista, musica);
const chave = `${info.artista} - ${info.musica}`;

const jaExiste = await musicaExiste(info.artista, info.musica);
if (jaExiste) {
  console.warn(`🔁 Já existe: ${chave}`);
  continue;
}
    const novaEntrada = {
      nome: `${artista} - ${musica}`,
      arquivo,
      artista: info.artista,
      musica: info.musica,
      genero: info.genero,
      album: info.album,
      imagemArtista: info.imagemArtista,
      imagemAlbum: info.imagemAlbum,
	  chave
    };

    if (
      info.album === 'desconhecido' &&
      !info.imagemArtista &&
      !info.imagemAlbum
    ) {
      console.warn(`❌ Ignorado: ${artista} - ${musica} (informações incompletas)`);
      continue;
    }

    await db.ref('musicas').push(novaEntrada);
    contador++;
    console.log(`✔️ [${contador}] Adicionado: ${info.artista} - ${info.musica}`);
  }

  console.log(`\n🎉 Finalizado! ${contador} músicas enviadas ao Firebase.`);
}
processar();