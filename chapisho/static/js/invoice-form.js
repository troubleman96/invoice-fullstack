(function() {
  const form = document.getElementById('invoiceForm');
  if (!form) return;

  const itemsContainer = document.getElementById('items-container');
  const addItemBtn = document.getElementById('addItemBtn');
  const itemTemplate = document.getElementById('itemTemplate');
  const totalForms = document.querySelector('input[name="items-TOTAL_FORMS"]');

  function updateLineTotals() {
    const rows = itemsContainer.querySelectorAll('.item-row');
    let subtotal = 0;

    rows.forEach(function(row) {
      if (row.style.display === 'none') return;
      const qty = parseFloat(row.querySelector('[name$="-quantity"]')?.value) || 0;
      const price = parseFloat(row.querySelector('[name$="-unit_price"]')?.value) || 0;
      const lineTotal = qty * price;
      const lineTotalSpan = row.querySelector('.line-total');
      if (lineTotalSpan) lineTotalSpan.textContent = 'TZS ' + Math.round(lineTotal).toLocaleString('en-US');
      subtotal += lineTotal;
    });

    const vatEnabled = form.querySelector('[name="vat_enabled"]')?.checked || false;
    const vatPercent = parseFloat(form.querySelector('[name="vat_percent"]')?.value) || 18;
    const discountType = form.querySelector('[name="discount_type"]')?.value || '';
    const discountValue = parseFloat(form.querySelector('[name="discount_value"]')?.value) || 0;

    let vatAmount = vatEnabled ? subtotal * (vatPercent / 100) : 0;
    let discountAmount = 0;
    if (discountType === 'percent') {
      discountAmount = subtotal * (discountValue / 100);
    } else if (discountType === 'fixed') {
      discountAmount = discountValue;
    }
    const grandTotal = subtotal + vatAmount - discountAmount;

    document.getElementById('previewSubtotal').textContent = 'TZS ' + Math.round(subtotal).toLocaleString('en-US');
    document.getElementById('previewVat').textContent = 'TZS ' + Math.round(vatAmount).toLocaleString('en-US');
    document.getElementById('previewGrandTotal').textContent = 'TZS ' + Math.round(grandTotal).toLocaleString('en-US');

    if (window.updatePreview) window.updatePreview();
  }

  function addItemRow() {
    const currentCount = itemsContainer.querySelectorAll('.item-row:not([style*="display: none"])').length;
    const template = itemTemplate.querySelector('.item-row').cloneNode(true);
    const newIndex = parseInt(totalForms.value);

    template.querySelectorAll('input').forEach(function(input) {
      const name = input.getAttribute('name');
      const id = input.getAttribute('id');
      if (name) input.setAttribute('name', name.replace(/__prefix__/g, newIndex));
      if (id) input.setAttribute('id', id.replace(/__prefix__/g, newIndex));
      input.value = '';
    });

    template.querySelectorAll('label').forEach(function(label) {
      const htmlFor = label.getAttribute('for');
      if (htmlFor) label.setAttribute('for', htmlFor.replace(/__prefix__/g, newIndex));
    });

    const removeBtn = template.querySelector('.remove-item');
    if (removeBtn) removeBtn.style.display = 'inline-block';

    itemsContainer.appendChild(template);
    totalForms.value = newIndex + 1;

    attachRowEvents(template);
    updateLineTotals();
  }

  function removeItemRow(btn) {
    const row = btn.closest('.item-row');
    const deleteCheckbox = row.querySelector('input[type="checkbox"][name$="-DELETE"]');
    if (deleteCheckbox) {
      deleteCheckbox.checked = true;
      row.style.display = 'none';
    } else {
      row.remove();
    }
    updateLineTotals();
  }

  function attachRowEvents(row) {
    row.querySelectorAll('input[name$="-quantity"], input[name$="-unit_price"], input[name$="-description"]').forEach(function(input) {
      input.addEventListener('input', updateLineTotals);
    });
    const removeBtn = row.querySelector('.remove-item');
    if (removeBtn) {
      removeBtn.addEventListener('click', function() { removeItemRow(this); });
    }
  }

  document.querySelectorAll('#items-container .item-row').forEach(attachRowEvents);

  if (addItemBtn) {
    addItemBtn.addEventListener('click', addItemRow);
  }

  form.querySelectorAll('[name="vat_enabled"], [name="vat_percent"], [name="discount_type"], [name="discount_value"], [name="notes"]').forEach(function(input) {
    input.addEventListener('change', updateLineTotals);
    input.addEventListener('input', updateLineTotals);
  });

  updateLineTotals();

  const addCustomerBtn = document.getElementById('addCustomerBtn');
  const quickForm = document.getElementById('quickCustomerForm');
  const saveQuickBtn = document.getElementById('saveQuickCustomer');
  const cancelQuickBtn = document.getElementById('cancelQuickCustomer');

  if (addCustomerBtn && quickForm) {
    addCustomerBtn.addEventListener('click', function() {
      quickForm.style.display = 'block';
    });
  }

  if (cancelQuickBtn && quickForm) {
    cancelQuickBtn.addEventListener('click', function() {
      quickForm.style.display = 'none';
    });
  }

  if (saveQuickBtn) {
    saveQuickBtn.addEventListener('click', function() {
      const data = new FormData();
      data.append('name', quickForm.querySelector('[name="customer-name"]')?.value || '');
      data.append('phone', quickForm.querySelector('[name="customer-phone"]')?.value || '');
      data.append('email', quickForm.querySelector('[name="customer-email"]')?.value || '');
      data.append('address', quickForm.querySelector('[name="customer-address"]')?.value || '');
      data.append('csrfmiddlewaretoken', form.querySelector('[name="csrfmiddlewaretoken"]')?.value || '');

      fetch('/ankara/mteja-haraka/', {
        method: 'POST',
        body: data,
        headers: {'X-Requested-With': 'XMLHttpRequest'},
      })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.id) {
          const select = form.querySelector('[name="customer"]');
          const opt = document.createElement('option');
          opt.value = data.id;
          opt.textContent = data.name + ' (' + data.phone + ')';
          select.appendChild(opt);
          select.value = data.id;
          quickForm.style.display = 'none';
          quickForm.querySelectorAll('input').forEach(function(i) { i.value = ''; });
          if (window.updatePreview) window.updatePreview();
        }
      });
    });
  }
})();
