const db = firebase.database();
const PRECO_POR_CREDITO = 2.00;

const usuariosDiv = document.getElementById('usuarios');
const cadastroStatus = document.getElementById('cadastroStatus');

function mostrarStatus(el, mensagem, tipo) {
  el.textContent = mensagem;
  el.className = `status-msg show ${tipo}`;
  clearTimeout(el._timeout);
  el._timeout = setTimeout(() => el.classList.remove('show'), 4000);
}

function cadastrarUsuario() {
  const nomeInput = document.getElementById('nome');
  const valorInput = document.getElementById('valorPago');
  const nome = nomeInput.value.trim().toLowerCase();
  const valorPago = parseFloat(valorInput.value);

  if (!nome || isNaN(valorPago) || valorPago <= 0) {
    mostrarStatus(cadastroStatus, 'Preencha todos os campos corretamente.', 'error');
    return;
  }
  const maxMusicas = Math.floor(valorPago / PRECO_POR_CREDITO);
  if (maxMusicas <= 0) {
    mostrarStatus(cadastroStatus, 'Valor insuficiente para gerar créditos.', 'error');
    return;
  }
  db.ref('usuarios/' + nome).set({ nome, maxMusicas, musicasPedidas: 0 });
  nomeInput.value = '';
  valorInput.value = '';
  mostrarStatus(cadastroStatus, `Usuário cadastrado com ${maxMusicas} músicas!`, 'success');
}

function criarLinhaUsuario(user) {
  const div = document.createElement('div');
  div.className = 'usuario';
  div.innerHTML = `
    <div class="usuario-info">
      <strong>${user.nome}</strong>
      <div class="usuario-meta">
        🎶 ${user.musicasPedidas}/${user.maxMusicas} músicas usadas &middot;
        💰 Total: R$ ${(user.musicasPedidas * PRECO_POR_CREDITO).toFixed(2)}
      </div>
    </div>
    <div class="usuario-acoes">
      <button type="button" class="secondary btn-toggle-credito">Adicionar Créditos</button>
      <button type="button" class="danger btn-remover">Remover</button>
    </div>
    <form class="credito-form hidden">
      <label class="visually-hidden" for="credito-${user.nome}">Valor pago (R$)</label>
      <input type="number" id="credito-${user.nome}" min="0" step="0.01" placeholder="Valor pago (R$)">
      <button type="submit">Confirmar</button>
      <button type="button" class="secondary btn-cancelar-credito">Cancelar</button>
    </form>
  `;

  const creditoForm = div.querySelector('.credito-form');
  const status = document.createElement('div');
  status.className = 'status-msg';
  div.appendChild(status);

  div.querySelector('.btn-toggle-credito').addEventListener('click', () => {
    creditoForm.classList.toggle('hidden');
    if (!creditoForm.classList.contains('hidden')) {
      creditoForm.querySelector('input').focus();
    }
  });

  div.querySelector('.btn-cancelar-credito').addEventListener('click', () => {
    creditoForm.classList.add('hidden');
    creditoForm.querySelector('input').value = '';
  });

  creditoForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = creditoForm.querySelector('input');
    const valor = parseFloat(input.value);
    if (isNaN(valor) || valor <= 0) {
      mostrarStatus(status, 'Valor inválido.', 'error');
      return;
    }
    const novosCreditos = Math.floor(valor / PRECO_POR_CREDITO);
    if (novosCreditos <= 0) {
      mostrarStatus(status, 'Valor insuficiente para adicionar créditos.', 'error');
      return;
    }
    const novoMax = (user.maxMusicas || 0) + novosCreditos;
    db.ref('usuarios/' + user.nome.toLowerCase()).update({ maxMusicas: novoMax }).then(() => {
      mostrarStatus(status, `Adicionado ${novosCreditos} música(s)!`, 'success');
      input.value = '';
      creditoForm.classList.add('hidden');
    });
  });

  div.querySelector('.btn-remover').addEventListener('click', () => {
    if (confirm(`Remover o usuário "${user.nome}"? Essa ação não pode ser desfeita.`)) {
      db.ref('usuarios/' + user.nome.toLowerCase()).remove();
    }
  });

  return div;
}

function carregarUsuarios() {
  db.ref('usuarios').on('value', snapshot => {
    usuariosDiv.innerHTML = '';
    if (!snapshot.exists()) {
      usuariosDiv.innerHTML = '<p class="vazio">Nenhum usuário cadastrado ainda.</p>';
      return;
    }
    snapshot.forEach(childSnapshot => {
      usuariosDiv.appendChild(criarLinhaUsuario(childSnapshot.val()));
    });
  });
}

function resetarContagem() {
  if (confirm('Tem certeza que deseja resetar a contagem de músicas de todos os usuários?')) {
    db.ref('usuarios').once('value').then(snapshot => {
      const updates = {};
      snapshot.forEach(childSnapshot => {
        updates[childSnapshot.key + '/musicasPedidas'] = 0;
      });
      db.ref('usuarios').update(updates);
    });
  }
}

function limparFila() {
  if (confirm('Tem certeza que deseja limpar toda a playlist?')) {
    db.ref('fila').remove();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('cadastroForm').addEventListener('submit', (e) => {
    e.preventDefault();
    cadastrarUsuario();
  });
  document.getElementById('btnResetarContagem').addEventListener('click', resetarContagem);
  document.getElementById('btnLimparFila').addEventListener('click', limparFila);
  carregarUsuarios();
});
