
document.addEventListener('DOMContentLoaded', () => {
  const player = document.getElementById('player');
  const iniciarBtn = document.getElementById('iniciarKaraoke');
  const musicaAtualElement = document.getElementById('musicaAtual');
  const filaElement = document.getElementById('fila');
  const timerDiv = document.getElementById('timerProxima');
  const contadorSpan = document.getElementById('contador');
  const qrCenter = document.getElementById('qr-center');
  const qrFixed = document.getElementById('qr-fixed');
  const notifDiv = document.getElementById('notificacao');
  const notifTexto = document.getElementById('notificacaoTexto');

  // Evita quebra em runtime caso o Firebase não esteja inicializado.
  const db = typeof firebase !== 'undefined' ? firebase.database() : null;

  if (!player) {
    console.error('Elemento de player não encontrado.');
    return;
  }

  if (!db) {
    console.error('Firebase não foi inicializado corretamente.');
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
  let countdownInterval = null;
  let countdownForKey = null;

  function limparContagemRegressiva() {
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
  }

  function iniciarKaraoke() {
    db.ref('fila').on(
      'value',
      snapshot => {
        // Ignora itens incompletos para evitar falhas ao tocar vídeo.
        fila = snapshot.val()
          ? Object.entries(snapshot.val())
              .map(([key, value]) => ({
                arquivo: value?.arquivo,
                nome: value?.nome || 'Sem título',
                cantor: value?.cantor || 'Cantor desconhecido',
                key
              }))
              .filter(musica => Boolean(musica.arquivo))
          : [];

        atualizarFilaUI();
        if (!currentSong) {
          tocarProxima();
        }
      },
      error => {
        console.error('Erro ao observar fila no Firebase:', error);
      }
    );
  }

  function atualizarFilaUI() {
    if (!filaElement) return;

    filaElement.innerHTML = '';
    fila.forEach(musica => {
      const li = document.createElement('li');
      li.innerText = `${musica.cantor} - ${musica.nome}`;
      filaElement.appendChild(li);
    });
  }

  function tocarProxima() {
    limparContagemRegressiva();

    if (fila.length === 0) {
      currentSong = null;
      countdownForKey = null;
      if (timerDiv) timerDiv.style.display = 'none';
      if (musicaAtualElement) musicaAtualElement.innerText = 'Nenhuma música ainda';
      player.src = '';

      if (qrCenter) qrCenter.style.display = 'flex';
      if (qrFixed) qrFixed.style.display = 'none';
      return;
    }

    const proxima = fila[0];
    // Evita reiniciar a mesma contagem quando o evento de fila chega repetidamente.
    if (countdownForKey === proxima.key) return;

    let segundos = 15;
    countdownForKey = proxima.key;

    if (timerDiv && contadorSpan) {
      timerDiv.style.display = 'block';
      timerDiv.classList.add('mostrar');
      contadorSpan.innerText = segundos;
    }

    countdownInterval = setInterval(() => {
      segundos -= 1;
      if (contadorSpan) contadorSpan.innerText = segundos;
      if (segundos > 0) return;

      limparContagemRegressiva();
      if (timerDiv) timerDiv.style.display = 'none';

      currentSong = proxima;
      countdownForKey = null;
      if (musicaAtualElement) musicaAtualElement.innerText = `${currentSong.cantor} - ${currentSong.nome}`;
      player.src = `videos/${currentSong.arquivo}`;
      player.play().catch(error => {
        console.error('Falha ao iniciar reprodução:', error);
        if (iniciarBtn) {
          iniciarBtn.style.display = 'block';
        }
      });

      if (notifDiv && notifTexto) {
        notifTexto.innerText = `${currentSong.cantor} - ${currentSong.nome}`;
        notifDiv.style.display = 'block';
        setTimeout(() => {
          notifDiv.style.display = 'none';
        }, 5000);
      }

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
      .catch(error => {
        console.error('Erro ao remover música finalizada da fila:', error);
      })
      .finally(() => tocarProxima());
  });

  function gerarQRCode() {
    const url = 'https://acarvalhosp.github.io/videoke/controle.html';
    const qrSize = Math.round(256 / 3);
    const opcoes = {
      text: url,
      width: qrSize,
      height: qrSize,
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
