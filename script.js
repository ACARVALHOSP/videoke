
document.addEventListener('DOMContentLoaded', () => {
  const player = document.getElementById('player');
  const iniciarBtn = document.getElementById('iniciarKaraoke');
  const db = firebase.database();

  if (!player) {
    console.error('Elemento de player não encontrado.');
    return;
  }

  if (iniciarBtn) {
    iniciarBtn.addEventListener('click', () => {
      player
        .play()
        .then(() => {
          iniciarBtn.style.display = 'none';
        })
        .catch(() => {
          alert('Não foi possível iniciar a reprodução automaticamente.');
        });
    });
  }

  let fila = [];
  let currentSong = null;

  function iniciarKaraoke() {
    db.ref('fila').on('value', snapshot => {
      fila = snapshot.val()
        ? Object.entries(snapshot.val()).map(([key, value]) => ({
            arquivo: value.arquivo,
            nome: value.nome,
            cantor: value.cantor,
            key
          }))
        : [];

      atualizarFilaUI();
      if (!currentSong && fila.length > 0) {
        tocarProxima();
      }
    });
  }

  function atualizarFilaUI() {
    const filaElement = document.getElementById('fila');
    if (!filaElement) return;

    filaElement.innerHTML = '';
    fila.forEach(musica => {
      const li = document.createElement('li');
      li.innerText = `${musica.cantor} - ${musica.nome}`;
      filaElement.appendChild(li);
    });
  }

  function tocarProxima() {
    if (fila.length === 0) {
      currentSong = null;
      document.getElementById('musicaAtual').innerText = 'Nenhuma música ainda';
      player.src = '';

      const qrCenter = document.getElementById('qr-center');
      const qrFixed = document.getElementById('qr-fixed');
      if (qrCenter) qrCenter.style.display = 'flex';
      if (qrFixed) qrFixed.style.display = 'none';
      return;
    }

    const proxima = fila[0];
    let segundos = 15;

    const timerDiv = document.getElementById('timerProxima');
    const contadorSpan = document.getElementById('contador');
    if (timerDiv && contadorSpan) {
      timerDiv.classList.add('mostrar');
      contadorSpan.innerText = segundos;
    }

    const intervalo = setInterval(() => {
      segundos -= 1;
      if (contadorSpan) contadorSpan.innerText = segundos;
      if (segundos > 0) return;

      clearInterval(intervalo);
      if (timerDiv) timerDiv.style.display = 'none';

      currentSong = proxima;
      document.getElementById('musicaAtual').innerText = `${currentSong.cantor} - ${currentSong.nome}`;
      player.src = `videos/${currentSong.arquivo}`;
      player.play().catch(() => {
        if (iniciarBtn) iniciarBtn.style.display = 'block';
      });

      const notifDiv = document.getElementById('notificacao');
      const notifTexto = document.getElementById('notificacaoTexto');
      if (notifDiv && notifTexto) {
        notifTexto.innerText = `${currentSong.cantor} - ${currentSong.nome}`;
        notifDiv.style.display = 'block';
        setTimeout(() => {
          notifDiv.style.display = 'none';
        }, 5000);
      }

      const qrCenter = document.getElementById('qr-center');
      const qrFixed = document.getElementById('qr-fixed');
      if (qrCenter) qrCenter.style.display = 'none';
      if (qrFixed) qrFixed.style.display = 'block';
    }, 1000);
  }

  player.addEventListener('ended', () => {
    if (!currentSong?.key) {
      tocarProxima();
      return;
    }

    const musicaFinalizada = currentSong.key;
    currentSong = null;

    db.ref(`fila/${musicaFinalizada}`)
      .remove()
      .finally(() => tocarProxima());
  });

  function gerarQRCode() {
    const url = 'https://acarvalhosp.github.io/videoke/controle.html';
    const opcoes = {
      text: url,
      width: 256,
      height: 256,
      colorDark: '#000000',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.H
    };

    const central = document.getElementById('qrcode-central');
    const fixed = document.getElementById('qrcode-fixed');
    if (central) new QRCode(central, opcoes);
    if (fixed) new QRCode(fixed, opcoes);
  }

  gerarQRCode();
  iniciarKaraoke();
});
