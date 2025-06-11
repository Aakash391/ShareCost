(() => {
  // DOM elements - Groups
  const groupsSection = document.getElementById('groups-section');
  const groupNameInput = document.getElementById('group-name-input');
  const addGroupBtn = document.getElementById('add-group-btn');
  const groupsList = document.getElementById('groups-list');

  // DOM elements - Group details
  const groupDetailSection = document.getElementById('group-detail-section');
  const backToGroupsBtn = document.getElementById('back-to-groups');
  const currentGroupTitle = document.getElementById('current-group-title');

  // Participants elements
  const participantNameInput = document.getElementById('participant-name');
  const addParticipantBtn = document.getElementById('add-participant');
  const participantsList = document.getElementById('participants-list');

  // Expenses elements
  const expensesSection = document.getElementById('expenses-section');
  const expenseDescInput = document.getElementById('expense-desc');
  const expenseAmountInput = document.getElementById('expense-amount');
  const expensePaidBySelect = document.getElementById('expense-paid-by');
  const expenseParticipantsDiv = document.getElementById('expense-participants');
  const addExpenseBtn = document.getElementById('add-expense');
  const expensesList = document.getElementById('expenses-list');

  // Balances elements
  const balancesSection = document.getElementById('balances-section');
  const balancesList = document.getElementById('balances-list');

  // State: list of groups, and current group name
  let groups = JSON.parse(localStorage.getItem('expenseSplitterGroups') || '{}'); // { groupName: {participants:[], expenses:[] } }
  let currentGroup = null;

  // Save all groups to localStorage
  function saveGroups() {
    localStorage.setItem('expenseSplitterGroups', JSON.stringify(groups));
  }

  // Render list of groups on homepage
  function renderGroupsList() {
    groupsList.innerHTML = '';
    const groupNames = Object.keys(groups);
    if (groupNames.length === 0) {
      groupsList.innerHTML = '<li>No groups created yet.</li>';
      return;
    }
    groupNames.forEach(name => {
      const li = document.createElement('li');
      li.textContent = name;
      li.onclick = () => openGroup(name);

      // Delete group button
      const delBtn = document.createElement('button');
      delBtn.textContent = 'Delete';
      delBtn.className = 'delete-btn';
      delBtn.onclick = (e) => {
        e.stopPropagation(); // prevent triggering li click
        if (confirm(`Delete group "${name}"? This action cannot be undone.`)) {
          delete groups[name];
          saveGroups();
          renderGroupsList();
        }
      };

      li.appendChild(delBtn);
      groupsList.appendChild(li);
    });
  }

  // Open a group (show group detail section, hide groups homepage)
  function openGroup(name) {
    currentGroup = name;
    groupsSection.style.display = 'none';
    groupDetailSection.style.display = 'block';
    currentGroupTitle.textContent = `Group: ${name}`;

    // Load group data or initialize if missing
    if (!groups[currentGroup]) {
      groups[currentGroup] = { participants: [], expenses: [] };
      saveGroups();
    }

    renderParticipants();
    renderExpenses();
    calculateBalances();
  }

  // Go back to groups homepage
  backToGroupsBtn.onclick = () => {
    currentGroup = null;
    groupDetailSection.style.display = 'none';
    groupsSection.style.display = 'block';

    clearGroupDetailInputs();
    renderGroupsList();
  };

  // Clear inputs inside group detail page
  function clearGroupDetailInputs() {
    participantNameInput.value = '';
    expenseDescInput.value = '';
    expenseAmountInput.value = '';
  }

  // PARTICIPANTS MANAGEMENT
  function renderParticipants() {
    participantsList.innerHTML = '';
    expensePaidBySelect.innerHTML = '';
    expenseParticipantsDiv.innerHTML = '';

    const participants = groups[currentGroup].participants;

    if (participants.length === 0) {
      expensesSection.style.display = 'none';
      balancesSection.style.display = 'none';
      return;
    } else {
      expensesSection.style.display = 'block';
      balancesSection.style.display = 'block';
    }

    participants.forEach((p, idx) => {
      // Participants list with remove button
      const li = document.createElement('li');
      li.textContent = p;

      const removeBtn = document.createElement('button');
      removeBtn.textContent = 'Remove';
      removeBtn.className = 'delete-btn';
      removeBtn.style.padding = '2px 7px';
      removeBtn.onclick = () => {
        // Remove participant only if not involved in any expenses
        if (isParticipantInExpenses(idx)) {
          alert(`Cannot remove participant "${p}" because they are involved in existing expenses.`);
          return;
        }
        groups[currentGroup].participants.splice(idx, 1);
        saveGroups();
        renderParticipants();
        renderExpenses();
        calculateBalances();
      };
      li.appendChild(removeBtn);

      participantsList.appendChild(li);

      // Paid by options
      const option = document.createElement('option');
      option.value = idx;
      option.textContent = p;
      expensePaidBySelect.appendChild(option);

      // Split Among checkboxes
      const label = document.createElement('label');
      label.innerHTML = `<input type="checkbox" value="${idx}" checked /> ${p}`;
      expenseParticipantsDiv.appendChild(label);
    });
  }

  // Check if participant index is in any expense (paidBy or split)
  function isParticipantInExpenses(participantIdx) {
    const expenses = groups[currentGroup].expenses;
    return expenses.some(exp => exp.paidBy === participantIdx || exp.split.includes(participantIdx));
  }

  addParticipantBtn.onclick = () => {
    const name = participantNameInput.value.trim();
    if (!name) {
      alert('Please enter a participant name.');
      return;
    }
    const participants = groups[currentGroup].participants;
    if (participants.includes(name)) {
      alert('Participant already added.');
      return;
    }
    participants.push(name);
    participantNameInput.value = '';
    saveGroups();
    renderParticipants();
    renderExpenses();
    calculateBalances();
  };

  // EXPENSES MANAGEMENT
  function renderExpenses() {
    expensesList.innerHTML = '';
    const expenses = groups[currentGroup].expenses;
    const participants = groups[currentGroup].participants;
    if (expenses.length === 0) {
      expensesList.innerHTML = '<li>No expenses added yet.</li>';
      return;
    }
    expenses.forEach((e, idx) => {
      const li = document.createElement('li');
      li.innerHTML = `<strong>${e.description || 'Expense'}:</strong> $${e.amount.toFixed(2)} paid by <em>${participants[e.paidBy]}</em>, split among ${e.split.map(i => participants[i]).join(', ')}`;

      // Delete button
      const delBtn = document.createElement('button');
      delBtn.textContent = 'Delete';
      delBtn.className = 'delete-btn';
      delBtn.onclick = () => {
        expenses.splice(idx, 1);
        saveGroups();
        renderExpenses();
        calculateBalances();
      };
      li.appendChild(delBtn);

      expensesList.appendChild(li);
    });
  }

  addExpenseBtn.onclick = () => {
    const desc = expenseDescInput.value.trim();
    const amount = parseFloat(expenseAmountInput.value);
    const paidBy = parseInt(expensePaidBySelect.value);
    const checkedBoxes = Array.from(expenseParticipantsDiv.querySelectorAll('input[type=checkbox]:checked'));
    const split = checkedBoxes.map(cb => parseInt(cb.value));

    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount.');
      return;
    }
    if (split.length === 0) {
      alert('Please select at least one participant to split the expense.');
      return;
    }

    groups[currentGroup].expenses.push({ description: desc, amount, paidBy, split });
    expenseDescInput.value = '';
    expenseAmountInput.value = '';
    saveGroups();
    renderExpenses();
    calculateBalances();
  };

  // BALANCE CALCULATION
  function calculateBalances() {
    const participants = groups[currentGroup].participants;
    if (participants.length === 0) return;

    const balances = Array(participants.length).fill(0);
    const expenses = groups[currentGroup].expenses;

    expenses.forEach(expense => {
      const share = expense.amount / expense.split.length;
      expense.split.forEach(i => {
        balances[i] -= share;
      });
      balances[expense.paidBy] += expense.amount;
    });

    balancesList.innerHTML = '';
    participants.forEach((p, i) => {
      const li = document.createElement('li');
      const bal = balances[i];
      li.textContent = `${p}: $${Math.abs(bal).toFixed(2)}`;
      li.className = bal >= 0 ? 'positive' : 'negative';
      if (bal >= 0) {
        li.textContent += ' (is owed)';
      } else {
        li.textContent += ' (owes)';
      }
      balancesList.appendChild(li);
    });
  }

  // GROUP CREATION
  addGroupBtn.onclick = () => {
    const name = groupNameInput.value.trim();
    if (!name) {
      alert('Please enter a group name.');
      return;
    }
    if (groups[name]) {
      alert('Group name already exists. Please choose another.');
      return;
    }
    groups[name] = { participants: [], expenses: [] };
    groupNameInput.value = '';
    saveGroups();
    renderGroupsList();
  };

  // Initial load
  renderGroupsList();

})();