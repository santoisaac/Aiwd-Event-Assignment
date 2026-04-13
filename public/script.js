const appState = {
  events: [],
  filtered: []
};

function formatDate(iso) {
  return new Date(iso).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

function renderEvents() {
  const grid = $('#eventsGrid');
  grid.empty();

  if (!appState.filtered.length) {
    grid.append('<p>No events match your filter.</p>');
    return;
  }

  appState.filtered.forEach((eventItem) => {
    const seatsLeft = Math.max(0, eventItem.capacity - (eventItem.registeredCount || 0));
    const card = `
      <article class="event-card">
        <span class="pill">${eventItem.category}</span>
        <h3>${eventItem.title}</h3>
        <p class="meta">${formatDate(eventItem.startAt)} | ${eventItem.location}</p>
        <p>${eventItem.summary}</p>
        <p class="meta">Seats Left: ${seatsLeft}</p>
        <button data-event-id="${eventItem.id}">Register For This Event</button>
      </article>
    `;
    grid.append(card);
  });
}

function applyFilters() {
  const query = ($('#searchInput').val() || '').trim().toLowerCase();
  const category = $('#categoryFilter').val();

  appState.filtered = appState.events.filter((eventItem) => {
    const passCategory = category === 'All' || eventItem.category === category;
    const haystack = `${eventItem.title} ${eventItem.summary} ${eventItem.category} ${eventItem.location}`.toLowerCase();
    const passQuery = !query || haystack.includes(query);
    return passCategory && passQuery;
  });

  renderEvents();
}

function populateSelectors() {
  const categories = [...new Set(appState.events.map(item => item.category))];
  const categoryEl = $('#categoryFilter');
  const eventSelect = $('#eventSelect');

  categories.forEach((category) => {
    categoryEl.append(`<option value="${category}">${category}</option>`);
  });

  appState.events.forEach((eventItem, index) => {
    eventSelect.append(`<option value="${eventItem.id}">${eventItem.title}</option>`);
    if (index === 0) {
      $('#eventId').val(eventItem.id);
    }
  });
}

function setCountdown() {
  if (!appState.events.length) {
    $('#countdown').text('Event schedule will be announced soon.');
    return;
  }

  const next = appState.events
    .map(item => new Date(item.startAt).getTime())
    .filter(time => time > Date.now())
    .sort((a, b) => a - b)[0];

  if (!next) {
    $('#countdown').text('Mindcraft events are now live.');
    return;
  }

  const tick = () => {
    const diff = next - Date.now();
    if (diff <= 0) {
      $('#countdown').text('Mindcraft events are now live.');
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const mins = Math.floor((diff / (1000 * 60)) % 60);
    $('#countdown').text(`${days}d ${hours}h ${mins}m to next event`);
  };

  tick();
  setInterval(tick, 60000);
}

async function loadHealth() {
  try {
    const response = await fetch('/health');
    const data = await response.json();
    $('#healthInfo').text(`Connected store: ${data.activeStore} | Mongo state: ${data.mongoReadyState}`);
  } catch (error) {
    $('#healthInfo').text('Unable to fetch health status.');
  }
}

async function loadEvents() {
  const response = await fetch('/api/events');
  const payload = await response.json();
  appState.events = payload.data || [];
  appState.filtered = [...appState.events];

  populateSelectors();
  renderEvents();
  setCountdown();
}

$(document).on('click', '.event-card button', function onPickEvent() {
  const eventId = $(this).data('event-id');
  $('#eventId').val(eventId);
  $('#eventSelect').val(eventId);
  document.getElementById('register').scrollIntoView({ behavior: 'smooth' });
});

$('#eventSelect').on('change', function onSelectChange() {
  $('#eventId').val($(this).val());
});

$('#searchInput').on('input', applyFilters);
$('#categoryFilter').on('change', applyFilters);

$('#eventForm').submit(async function onRegisterSubmit(e) {
  e.preventDefault();

  const selectedId = $('#eventId').val();
  const selectedEvent = appState.events.find(item => item.id === selectedId);
  const data = {
    name: $('#name').val(),
    email: $('#email').val(),
    phone: $('#phone').val(),
    college: $('#college').val(),
    eventId: selectedId,
    event: selectedEvent ? selectedEvent.title : undefined
  };

  try {
    const res = await fetch('/api/registrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await res.json();
    if (!res.ok) {
      $('#msg').removeClass('ok').addClass('err').text(result.error || 'Registration failed.');
      return;
    }

    $('#msg').removeClass('err').addClass('ok').text(result.message || 'Registered successfully!');
    $('#eventForm')[0].reset();
    if (appState.events.length) {
      $('#eventId').val(appState.events[0].id);
      $('#eventSelect').val(appState.events[0].id);
    }
    await loadEvents();
  } catch (error) {
    $('#msg').removeClass('ok').addClass('err').text('Network error while registering.');
  }
});

$(async function init() {
  await loadEvents();
  await loadHealth();
});
