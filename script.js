'use strict';

const menu = Object.freeze([
  { id: 'casa', name: 'Brasa da Casa', price: 2990 },
  { id: 'bacon', name: 'Bacon sem Dó', price: 3490 },
  { id: 'horta', name: 'Brasa da Horta', price: 2790 },
  { id: 'batata', name: 'Batata no Capricho', price: 1590, description: 'Porção de 300 g, crocante e sequinha.', group: 'Pra acompanhar' },
  { id: 'refri', name: 'Refrigerante', price: 690, description: 'Lata de 350 ml, bem gelada.', group: 'Pra refrescar' },
  { id: 'onion', name: 'Onion Rings', price: 1890, description: 'Anéis de cebola empanados, porção de 200 g.', group: 'Pra acompanhar' },
  { id: 'suco', name: 'Suco de Laranja', price: 990, description: 'Laranja espremida na hora, copo de 400 ml.', group: 'Pra refrescar' }
]);
const cart = new Map();
const money = cents => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dialog = document.querySelector('#order-dialog');
const itemsElement = document.querySelector('#order-items');
const footerElement = document.querySelector('#order-footer');
let toastTimer;

function notify(message) {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 2400);
}

function snapshot() {
  const items = menu.filter(item => cart.has(item.id)).map(item => ({ id: item.id, name: item.name, quantity: cart.get(item.id), unitPriceCents: item.price, totalCents: item.price * cart.get(item.id) }));
  return { items, totalCents: items.reduce((sum, item) => sum + item.totalCents, 0), currency: 'BRL', demonstration: true, sent: false };
}

function validateQuantity(id, quantity) {
  if (!menu.some(item => item.id === id)) throw new Error('Item não encontrado no cardápio.');
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > 99) throw new Error('Escolha uma quantidade inteira entre 0 e 99.');
}

function setQuantity(id, quantity) {
  validateQuantity(id, quantity);
  if (quantity === 0) cart.delete(id); else cart.set(id, quantity);
  renderOrder();
}

function renderOrder() {
  const order = snapshot();
  document.querySelector('#bag-count').textContent = order.items.reduce((sum, item) => sum + item.quantity, 0);
  if (!order.items.length) {
    itemsElement.innerHTML = '<div class="empty-order"><span aria-hidden="true">✳</span><h3>A fome chegou primeiro.</h3><p>Escolha seus favoritos no cardápio e monte um pedido do seu jeito.</p><button class="button primary" type="button" data-browse>Explorar o cardápio</button></div>';
    footerElement.innerHTML = '';
    return;
  }
  itemsElement.innerHTML = order.items.map(item => `<div class="order-line"><div class="order-product"><strong>${item.name}</strong><span>${money(item.unitPriceCents)} cada</span></div><div class="quantity"><button type="button" data-quantity="${item.id}" data-delta="-1" aria-label="Diminuir quantidade de ${item.name}">−</button><span aria-label="Quantidade de ${item.name}">${item.quantity}</span><button type="button" data-quantity="${item.id}" data-delta="1" aria-label="Aumentar quantidade de ${item.name}" ${item.quantity === 99 ? 'disabled' : ''}>+</button></div><strong class="line-price">${money(item.totalCents)}</strong></div>`).join('');
  footerElement.innerHTML = `<div class="total-row"><span>Total dos itens</span><strong>${money(order.totalCents)}</strong></div><button class="button primary copy-button" type="button" id="copy-order">Copiar meu pedido <span aria-hidden="true">↗</span></button><div id="copy-fallback"></div>`;
}

function openOrder() {
  renderOrder();
  if (!dialog.open) dialog.showModal();
  document.body.classList.add('dialog-open');
}

document.querySelector('#extras').innerHTML = ['Pra acompanhar', 'Pra refrescar'].map(group => `<div class="extra-group"><h3>${group}</h3>${menu.filter(item => item.group === group).map(item => `<article class="extra-item"><div><h4>${item.name}</h4><p>${item.description}</p><strong>${money(item.price)}</strong></div><button class="add-button" type="button" data-add="${item.id}" aria-label="Adicionar ${item.name} ao pedido">+</button></article>`).join('')}</div>`).join('');

document.querySelector('#open-order').addEventListener('click', openOrder);
document.querySelector('#close-order').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => document.body.classList.remove('dialog-open'));
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
});

document.addEventListener('click', async event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.add) {
    const id = button.dataset.add;
    const quantity = cart.get(id) || 0;
    if (quantity >= 99) { notify('Limite de 99 unidades por item.'); return; }
    setQuantity(id, quantity + 1);
    notify(`${menu.find(item => item.id === id).name} adicionado ao pedido.`);
  }
  if (button.dataset.quantity) {
    const id = button.dataset.quantity;
    const delta = Number(button.dataset.delta);
    setQuantity(id, (cart.get(id) || 0) + delta);
    const next = dialog.querySelector(`[data-quantity="${id}"][data-delta="${delta}"]:not(:disabled)`)
      || dialog.querySelector(`[data-quantity="${id}"]:not(:disabled)`)
      || dialog.querySelector('[data-browse]') || document.querySelector('#close-order');
    next.focus();
  }
  if (button.hasAttribute('data-browse')) {
    dialog.close();
    document.querySelector('#cardapio').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    document.querySelector('[data-add]').focus({ preventScroll: true });
  }
  if (button.id === 'copy-order') {
    const order = snapshot();
    const text = `BRASA LANCHERIA — PEDIDO DEMONSTRATIVO\n\n${order.items.map(item => `${item.quantity}x ${item.name} — ${money(item.totalCents)}`).join('\n')}\n\nTotal dos itens: ${money(order.totalCents)}\nPreços ilustrativos. Este pedido não foi enviado.`;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      button.textContent = 'Pedido copiado!';
    } catch {
      const fallback = document.querySelector('#copy-fallback');
      fallback.innerHTML = '<label for="order-text">Selecione e copie seu pedido abaixo:</label><textarea id="order-text" rows="7" readonly></textarea>';
      const field = document.querySelector('#order-text');
      field.value = text;
      field.focus();
      field.select();
    }
  }
});
renderOrder();

// Optional structured access uses exactly the same cart state as the interface.
if (document.modelContext?.registerTool) {
  const lifecycle = new AbortController();
  const register = tool => {
    try { Promise.resolve(document.modelContext.registerTool(tool, { signal: lifecycle.signal })).catch(() => {}); } catch { /* Ordinary browsing remains available. */ }
  };
  register({ name: 'read_brasa_menu_and_order', title: 'Consultar cardápio e pedido', description: 'Returns the illustrative menu and the current local demonstration order. No order is sent.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: false }, execute: () => ({ menu, order: snapshot() }) });
  register({ name: 'stage_brasa_order_items', title: 'Montar pedido demonstrativo', description: 'Sets quantities of selected menu items in the local demonstration order and opens its summary. Quantity zero removes an item. Does not place, send or charge for an order.', inputSchema: { type: 'object', properties: { items: { type: 'array', minItems: 1, maxItems: 7, items: { type: 'object', properties: { id: { type: 'string', enum: menu.map(item => item.id) }, quantity: { type: 'integer', minimum: 0, maximum: 99 } }, required: ['id', 'quantity'], additionalProperties: false } } }, required: ['items'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute(input) {
    if (!input || typeof input !== 'object' || Object.keys(input).some(key => key !== 'items') || !Array.isArray(input.items) || !input.items.length || input.items.length > 7) throw new Error('Informe de 1 a 7 itens.');
    const seen = new Set();
    for (const item of input.items) {
      if (!item || typeof item !== 'object' || Object.keys(item).some(key => !['id','quantity'].includes(key))) throw new Error('Item inválido.');
      validateQuantity(item.id, item.quantity);
      if (seen.has(item.id)) throw new Error('Não repita o mesmo item.');
      seen.add(item.id);
    }
    for (const item of input.items) setQuantity(item.id, item.quantity);
    openOrder();
    return snapshot();
  } });
  window.addEventListener('pagehide', () => lifecycle.abort(), { once: true });
}
