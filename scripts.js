let db;

function withDB(callback) {
  if (db) {
    callback(db);
  } else {
    const request = indexedDB.open('myDatabase', 3); // Increment to a new version

    request.onerror = (event) => {
      console.error("IndexedDB error:", event.target.error);
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      callback(db);
    };

    request.onupgradeneeded = (event) => {
      db = event.target.result;

      const storeNames = ['writeups', 'completedWriteups', 'hackerone', 'completedHackerone',
                          'gamificationData', 'videos', 'completedVideos', 'books',
                          'completedBooks', 'labs', 'completedLabs', 'dailyProgress'];

      storeNames.forEach(store => {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: store === 'books' ? 'title' : 'url' });
          console.log(`Created object store: ${store}`);
        }
      });
    };
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');
  let totalReadWriteups = 0;
  let totalReadReports = 0;
  let totalUnreadWriteups = 0;
  let totalUnreadReports = 0;
  let writeupsByDate = {};
  let reportsByDate = {};

  const writeupInput = document.getElementById('writeup-input');
  const writeupTag = document.getElementById('writeup-tag');
  const addWriteupButton = document.getElementById('add-writeup');
  const writeupsList = document.getElementById('writeups-list');
  const writeupsCompletedList = document.getElementById('completed-list');
  const hackeroneInput = document.getElementById('hackerone-input');
  const hackeroneTag = document.getElementById('hackerone-tag');
  const addHackeroneButton = document.getElementById('add-hackerone');
  const hackeroneList = document.getElementById('hackerone-list');
  const hackeroneCompletedList = document.getElementById('hackerone-completed-list');
  const videoInput = document.getElementById('video-input');
  const videoTag = document.getElementById('video-tag');
  const addVideoButton = document.getElementById('add-video');
  const videosList = document.getElementById('videos-list');
  const videosCompletedList = document.getElementById('completed-videos-list');
  const bookInput = document.getElementById('book-input');
  const bookTag = document.getElementById('book-tag');
  const addBookButton = document.getElementById('add-book');
  const booksList = document.getElementById('books-list');
  const booksCompletedList = document.getElementById('completed-books-list');
  const labInput = document.getElementById('lab-input');
  const labTag = document.getElementById('lab-tag');
  const addLabButton = document.getElementById('add-lab');
  const labsList = document.getElementById('labs-list');
  const labsCompletedList = document.getElementById('completed-labs-list');
  const dailyInput = document.getElementById('daily-input');
  const addDailyButton = document.getElementById('add-daily');
  const dailyList = document.getElementById('daily-list');
  let writeupTags = new Set();
  let hackeroneTags = new Set();

function createListItem(url, tag, date, isCompleted) {
  const listItem = document.createElement('li');
  const cleanUrl = url.replace(/,/g, '').trim();
  listItem.innerHTML = `
    <a href="${cleanUrl}" class="open-url" target="_blank">${cleanUrl}</a>
    <span class="tag">${tag || ''}</span>
    <span class="date">${date}</span>
    ${isCompleted ? '' : '<i class="fas fa-check-circle tick" onclick="markAsCompleted(this)"></i>'}
    <i class="fas fa-trash-alt remove" onclick="removeItem(this)"></i>`;
  return listItem;
}


function getStoreName(type) {
  return {
    writeup: 'writeups',
    hackerone: 'hackerone',
    video: 'videos',
    book: 'books',
    lab: 'labs',
    daily: 'dailyProgress'
  }[type];
}

function saveItemToDB(type, item, tag, date) {
  withDB((db) => {
    const storeName = getStoreName(type);
    if (!storeName) {
      console.error(`Invalid store name for type: ${type}`);
      return;
    }

    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put({
      [type === 'book' ? 'title' : 'url']: item,
      tag,
      date
    });

    request.onsuccess = () => {
      console.log(`${type} saved successfully:`, item);
    };
    request.onerror = (event) => {
      console.error(`Failed to save ${type}:`, event.target.error);
    };
  });
}


function addItems(list, items, tag, type) {
  const currentDate = getIndiaDate();
  items.forEach(item => {
    if (item.trim()) {
      const listItem = createListItem(item, tag, currentDate, false);
      list.appendChild(listItem);
      saveItemToDB(type, item.trim(), tag, currentDate);
    }
  });
  updateStatistics();
  updateCharts();
}


  addWriteupButton.addEventListener('click', () => {
  const urls = writeupInput.value.split('\n').filter(url => url.trim());
  if (urls.length) {
    addItems(writeupsList, urls, writeupTag.value, 'writeup');
    writeupInput.value = '';
    writeupTag.value = '';
  }
});

  addHackeroneButton.addEventListener('click', () => {
    const urls = hackeroneInput.value.split('\n').filter(url => url.trim() !== '');
    addItems(hackeroneList, urls, hackeroneTag.value, 'hackerone');
    hackeroneInput.value = '';
    hackeroneTag.value = '';
  });

  addVideoButton.addEventListener('click', () => {
    const urls = videoInput.value.split('\n').filter(url => url.trim() !== '');
    addItems(videosList, urls, videoTag.value, 'video');
    videoInput.value = '';
    videoTag.value = '';
  });

  addBookButton.addEventListener('click', () => {
    const titles = bookInput.value.split('\n').filter(title => title.trim() !== '');
    addItems(booksList, titles, bookTag.value, 'book');
    bookInput.value = '';
    bookTag.value = '';
  });

  addLabButton.addEventListener('click', () => {
    const urls = labInput.value.split('\n').filter(url => url.trim() !== '');
    addItems(labsList, urls, labTag.value, 'lab');
    labInput.value = '';
    labTag.value = '';
  });

  addDailyButton.addEventListener('click', () => {
    const entry = dailyInput.value.trim();
    if (entry) {
      addDailyEntry(entry);
      dailyInput.value = '';
    }
  });

  function addDailyEntry(entry) {
    const currentDate = getIndiaDate();
    const listItem = document.createElement('li');
    listItem.innerHTML = `
      <div class="daily-date">${currentDate}</div>
      <div class="daily-content">${entry}</div>
      <i class="fas fa-trash-alt remove" onclick="removeItem(this)"></i>`;
    dailyList.prepend(listItem);
    saveItemToDB('daily', entry, '', currentDate);
  }

  const writeupUnreadSearch = document.createElement('input');
  writeupUnreadSearch.type = 'text';
  writeupUnreadSearch.id = 'writeup-unread-search';
  writeupUnreadSearch.placeholder = 'Search unread write-ups...';

  const hackeroneUnreadSearch = document.createElement('input');
  hackeroneUnreadSearch.type = 'text';
  hackeroneUnreadSearch.id = 'hackerone-unread-search';
  hackeroneUnreadSearch.placeholder = 'Search unread reports...';

  const writeupUnreadSearchSuggestions = document.createElement('div');
  writeupUnreadSearchSuggestions.id = 'writeup-unread-search-suggestions';
  writeupUnreadSearchSuggestions.className = 'search-suggestions';

  const hackeroneUnreadSearchSuggestions = document.createElement('div');
  hackeroneUnreadSearchSuggestions.id = 'hackerone-unread-search-suggestions';
  hackeroneUnreadSearchSuggestions.className = 'search-suggestions';

  writeupsList.parentNode.insertBefore(writeupUnreadSearch, writeupsList);
  writeupsList.parentNode.insertBefore(writeupUnreadSearchSuggestions, writeupsList);

  hackeroneList.parentNode.insertBefore(hackeroneUnreadSearch, hackeroneList);
  hackeroneList.parentNode.insertBefore(hackeroneUnreadSearchSuggestions, hackeroneList);

  writeupUnreadSearch.addEventListener('input', () => {
    searchItems(writeupUnreadSearch.value, writeupsList, null, 'writeup-unread-search-suggestions', writeupTags);
  });

  hackeroneUnreadSearch.addEventListener('input', () => {
    searchItems(hackeroneUnreadSearch.value, hackeroneList, null, 'hackerone-unread-search-suggestions', hackeroneTags);
  });

  function showTab(tabId) {
    tabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabId);
    });
    tabContents.forEach(content => {
      content.classList.toggle('active', content.id === tabId);
    });
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      showTab(tab.dataset.tab);
    });
  });

  if (tabs.length > 0) {
    showTab(tabs[0].dataset.tab);
  }

  withDB(() => {
    loadData();
    gamificationModule.loadProgress();
    streakModule.loadStreakData();
  });

  function isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  function getIndiaDate() {
    const options = { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' };
    return new Date().toLocaleString('en-US', options).split('/').reverse().join('-');
  }

  function saveData() {
    withDB((db) => {
      const transaction = db.transaction(['writeups', 'completedWriteups', 'hackerone', 'completedHackerone'], 'readwrite');
      saveListData(transaction, 'writeups', writeupsList);
      saveListData(transaction, 'completedWriteups', writeupsCompletedList);
      saveListData(transaction, 'hackerone', hackeroneList);
      saveListData(transaction, 'completedHackerone', hackeroneCompletedList);
    });
  }

  function saveListData(transaction, storeName, list) {
    const store = transaction.objectStore(storeName);
    store.clear();
    Array.from(list.children).forEach(item => {
      const url = item.querySelector('.open-url').href;
      const tag = item.querySelector('.tag').textContent;
      const date = item.querySelector('.date').textContent;
      store.put({ url, tag, date });
    });
  }

 function loadData() {
  withDB((db) => {
    const transaction = db.transaction(['writeups', 'completedWriteups', 'hackerone',
                                        'completedHackerone', 'labs', 'completedLabs',
                                        'videos', 'completedVideos', 'books', 'completedBooks',
                                        'dailyProgress'], 'readonly');

    Promise.all([
      loadListData(transaction, 'writeups', writeupsList, false),
      loadListData(transaction, 'completedWriteups', writeupsCompletedList, true),
      loadListData(transaction, 'hackerone', hackeroneList, false),
      loadListData(transaction, 'completedHackerone', hackeroneCompletedList, true),
      loadListData(transaction, 'labs', labsList, false),
      loadListData(transaction, 'completedLabs', labsCompletedList, true),
      loadListData(transaction, 'videos', videosList, false),
      loadListData(transaction, 'completedVideos', videosCompletedList, true),
      loadListData(transaction, 'books', booksList, false),
      loadListData(transaction, 'completedBooks', booksCompletedList, true),
      loadListData(transaction, 'dailyProgress', dailyList, false)
    ]).then(() => {
      updateStatistics();
      updateCharts();
    });
  });
}

function loadListData(transaction, storeName, list, isCompleted) {
  return new Promise((resolve) => {
    const store = transaction.objectStore(storeName);
    list.innerHTML = ''; // Clear old UI elements
    store.openCursor().onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        console.log(`Loading ${storeName} item:`, cursor.value);
        const { url, tag, date } = cursor.value;
        const listItem = createListItem(url, tag, date, isCompleted);
        list.appendChild(listItem);
        cursor.continue();
      } else {
        console.log(`No more items in ${storeName}`);
        resolve();
      }
    };
  });
}


  function updateCountersAndDates(listId, date, isCompleted) {
    if (listId === 'writeups-list') {
      writeupsByDate[date] = (writeupsByDate[date] || 0) + 1;
      totalUnreadWriteups++;
    } else if (listId === 'completed-list') {
      totalReadWriteups++;
    } else if (listId === 'hackerone-list') {
      reportsByDate[date] = (reportsByDate[date] || 0) + 1;
      totalUnreadReports++;
    } else if (listId === 'hackerone-completed-list') {
      totalReadReports++;
    }
  }

window.markAsCompleted = function(element) {
  const item = element.closest('li');
  const sourceList = item.closest('ul');
  let targetList, storeName;

  switch(sourceList.id) {
    case 'writeups-list':
      targetList = document.getElementById('completed-list');
      storeName = 'completedWriteups';
      break;
    case 'hackerone-list':
      targetList = document.getElementById('hackerone-completed-list');
      storeName = 'completedHackerone';
      break;
    case 'videos-list':
      targetList = document.getElementById('completed-videos-list');
      storeName = 'completedVideos';
      break;
    case 'books-list':
      targetList = document.getElementById('completed-books-list');
      storeName = 'completedBooks';
      break;
    case 'labs-list':
      targetList = document.getElementById('completed-labs-list');
      storeName = 'completedLabs';
      break;
    default:
      return;
  }

  const url = item.querySelector('.open-url').href;
  const tag = item.querySelector('.tag').textContent;
  const date = item.querySelector('.date').textContent;

  const completedItem = createListItem(url, tag, date, true);
  targetList.appendChild(completedItem);
  item.remove();

  withDB((db) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    store.put({ url, tag, date });
    transaction.oncomplete = () => {
      updateStatistics();
    };
  });
};

window.removeItem = function (element) {
  const item = element.closest('li');
  const list = item.closest('ul');
  let storeName;

  if (list.id === 'writeups-list') {
    storeName = 'writeups';
  } else if (list.id === 'completed-list') {
    storeName = 'completedWriteups';
  } else if (list.id === 'hackerone-list') {
    storeName = 'hackerone';
  } else if (list.id === 'hackerone-completed-list') {
    storeName = 'completedHackerone';
  } else if (list.id === 'videos-list') {
    storeName = 'videos';
  } else if (list.id === 'completed-videos-list') {
    storeName = 'completedVideos';
  } else if (list.id === 'books-list') {
    storeName = 'books';
  } else if (list.id === 'completed-books-list') {
    storeName = 'completedBooks';
  } else if (list.id === 'labs-list') {
    storeName = 'labs';
  } else if (list.id === 'completed-labs-list') {
    storeName = 'completedLabs';
  } else {
    return;
  }

  withDB((db) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const url = item.querySelector('.open-url') ? item.querySelector('.open-url').href : item.textContent;
    store.delete(url);

    transaction.oncomplete = () => updateStatistics();
  });

  item.remove();
};


function updateStatistics() {
  withDB((db) => {
    const stores = [
      { store: 'completedWriteups', id: 'total-read-writeups' },
      { store: 'completedHackerone', id: 'total-read-reports' },
      { store: 'completedVideos', id: 'total-watched-videos' },
      { store: 'completedBooks', id: 'total-read-books' },
      { store: 'completedLabs', id: 'total-completed-labs' },
      { store: 'writeups', id: 'total-unread-writeups' },
      { store: 'hackerone', id: 'total-unread-reports' },
      { store: 'videos', id: 'total-unwatched-videos' },
      { store: 'books', id: 'total-unread-books' },
      { store: 'labs', id: 'total-pending-labs' }
    ];

    const transaction = db.transaction(stores.map(s => s.store), 'readonly');

    stores.forEach(({store, id}) => {
      const objectStore = transaction.objectStore(store);
      const countRequest = objectStore.count();
      countRequest.onsuccess = () => {
        const element = document.getElementById(id);
        if (element) {
          element.textContent = countRequest.result;
        }
      };
    });
  });
}

function countCompletedItems(transaction, storeName, elementId) {
  return new Promise((resolve) => {
    const store = transaction.objectStore(storeName);
    const request = store.count();

    request.onsuccess = () => {
      console.log(`✅ ${storeName} count:`, request.result); // Debugging
      document.getElementById(elementId).textContent = request.result;
      resolve();
    };

    request.onerror = (event) => {
      console.error(`❌ Failed to count ${storeName}:`, event.target.error);
      resolve();
    };
  });
}

function countCompletedItems(transaction, storeName, elementId) {
  return new Promise((resolve) => {
    const store = transaction.objectStore(storeName);
    const request = store.count();

    request.onsuccess = () => {
      document.getElementById(elementId).textContent = request.result;
      resolve();
    };
  });
}



  const writeupSearch = document.getElementById('writeup-search');
  const hackeroneSearch = document.getElementById('hackerone-search');

  writeupSearch.addEventListener('input', () => {
    searchItems(writeupSearch.value, writeupsList, writeupsCompletedList, 'writeup-search-suggestions', writeupTags);
  });

  hackeroneSearch.addEventListener('input', () => {
    searchItems(hackeroneSearch.value, hackeroneList, hackeroneCompletedList, 'hackerone-search-suggestions', hackeroneTags);
  });

  function searchItems(query, list, completedList, suggestionElementId, tagsSet) {
    const items = Array.from(list.children);
    const completedItems = completedList ? Array.from(completedList.children) : [];
    const suggestionsElement = document.getElementById(suggestionElementId);
    suggestionsElement.innerHTML = '';

    if (query === '') {
      items.forEach(item => item.style.display = '');
      completedItems.forEach(item => item.style.display = '');
      return;
    }

    items.forEach(item => {
      const url = item.querySelector('.open-url').textContent.toLowerCase();
      const tag = item.querySelector('.tag').textContent.toLowerCase();
      const date = item.querySelector('.date').textContent.toLowerCase();
      const matches = url.includes(query.toLowerCase()) || tag.includes(query.toLowerCase()) || date.includes(query.toLowerCase());
      item.style.display = matches ? '' : 'none';
    });

    completedItems.forEach(item => {
      const url = item.querySelector('.open-url').textContent.toLowerCase();
      const tag = item.querySelector('.tag').textContent.toLowerCase();
      const date = item.querySelector('.date').textContent.toLowerCase();
      const matches = url.includes(query.toLowerCase()) || tag.includes(query.toLowerCase()) || date.includes(query.toLowerCase());
      item.style.display = matches ? '' : 'none';
    });

    const suggestions = Array.from(tagsSet).filter(tag => tag.toLowerCase().includes(query.toLowerCase()));
    suggestions.forEach(suggestion => {
      const suggestionItem = document.createElement('div');
      suggestionItem.textContent = suggestion;
      suggestionItem.classList.add('suggestion-item');
      suggestionsElement.appendChild(suggestionItem);

      // Add click event listener for each suggestion item
      suggestionItem.addEventListener('click', () => {
        // Set the search input value to the clicked suggestion
        document.getElementById(suggestionElementId.replace('-suggestions', '')).value = suggestion;
        // Trigger the input event to filter the list based on the selected suggestion
        const event = new Event('input');
        document.getElementById(suggestionElementId.replace('-suggestions', '')).dispatchEvent(event);
        // Clear the suggestions after selection
        suggestionsElement.innerHTML = '';
      });
    });
  }

  const statsChartElement = document.getElementById('stats-chart').getContext('2d');
  const timelineChartElement = document.getElementById('timeline-chart').getContext('2d');
  let statsChart;
  let timelineChart;
function loadDashboard() {
  withDB((db) => {
    const transaction = db.transaction(['writeups', 'completedWriteups', 'hackerone', 'completedHackerone', 'videos', 'completedVideos', 'books', 'completedBooks', 'labs', 'completedLabs'], 'readonly');

    Promise.all([
      countItems(transaction, 'writeups', 'total-unread-writeups'),
      countItems(transaction, 'completedWriteups', 'total-read-writeups'),
      countItems(transaction, 'hackerone', 'total-unread-reports'),
      countItems(transaction, 'completedHackerone', 'total-read-reports'),
      countItems(transaction, 'videos', 'total-unwatched-videos'),
      countItems(transaction, 'completedVideos', 'total-watched-videos'),
      countItems(transaction, 'books', 'total-unread-books'),
      countItems(transaction, 'completedBooks', 'total-read-books'),
      countItems(transaction, 'labs', 'total-pending-labs'),
      countItems(transaction, 'completedLabs', 'total-completed-labs')
    ]);
  });
}

function countItems(transaction, storeName, elementId) {
  return new Promise((resolve) => {
    const store = transaction.objectStore(storeName);
    const request = store.count();

    request.onsuccess = () => {
      document.getElementById(elementId).textContent = request.result;
      resolve();
    };
  });
}


function countItems(transaction, storeName, elementId) {
  return new Promise((resolve) => {
    const store = transaction.objectStore(storeName);
    const request = store.count();
    request.onsuccess = () => {
      document.getElementById(elementId).textContent = request.result;
      resolve();
    };
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadDashboard();
  loadStatistics();
});
function loadStatistics() {
  withDB((db) => {
    const transaction = db.transaction(['completedWriteups', 'completedHackerone', 'completedVideos', 'completedBooks', 'completedLabs'], 'readonly');

    Promise.all([
      countCompletedItems(transaction, 'completedWriteups', 'Writeups'),
      countCompletedItems(transaction, 'completedHackerone', 'HackerOne Reports'),
      countCompletedItems(transaction, 'completedVideos', 'Videos'),
      countCompletedItems(transaction, 'completedBooks', 'Books'),
      countCompletedItems(transaction, 'completedLabs', 'Labs')
    ]).then((data) => {
      updateStatsChart(data);
    });
  });
}

function countCompletedItems(transaction, storeName, elementId) {
  return new Promise((resolve) => {
    const store = transaction.objectStore(storeName);
    const request = store.count();

    request.onsuccess = () => {
      console.log(`✅ ${storeName} count:`, request.result); // Debugging
      document.getElementById(elementId).textContent = request.result;
      resolve();
    };

    request.onerror = (event) => {
      console.error(`❌ Failed to count ${storeName}:`, event.target.error);
      resolve();
    };
  });
}


function updateStatsChart(data) {
  const labels = data.map(item => item.label);
  const values = data.map(item => item.count);

  const ctx = document.getElementById('stats-chart').getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Completed Items',
        data: values,
        backgroundColor: ['#00ff00', '#ff4444', '#0066ff', '#ffaa00', '#9900ff']
      }]
    },
    options: {
      responsive: true,
      scales: { y: { beginAtZero: true } }
    }
  });
}
  function updateCharts() {
    const labels = ['Writeups', 'Reports'];
    const readData = [totalReadWriteups, totalReadReports];
    const unreadData = [totalUnreadWriteups, totalUnreadReports];

    if (statsChart) {
      statsChart.data.datasets[0].data = readData;
      statsChart.data.datasets[1].data = unreadData;
      statsChart.update();
    } else {
      statsChart = new Chart(statsChartElement, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Read',
              data: readData,
              backgroundColor: 'rgba(75, 192, 192, 0.6)',
            },
            {
              label: 'Unread',
              data: unreadData,
              backgroundColor: 'rgba(255, 99, 132, 0.6)',
            },
          ],
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
            },
          },
        },
      });
    }

    const dates = Array.from(new Set([...Object.keys(writeupsByDate), ...Object.keys(reportsByDate)])).sort();
    const cumulativeWriteups = [];
    const cumulativeReports = [];
    let writeupSum = 0;
    let reportSum = 0;

    dates.forEach(date => {
      writeupSum += writeupsByDate[date] || 0;
      reportSum += reportsByDate[date] || 0;
      cumulativeWriteups.push(writeupSum);
      cumulativeReports.push(reportSum);
    });

    if (timelineChart) {
      timelineChart.data.labels = dates;
      timelineChart.data.datasets[0].data = cumulativeWriteups;
      timelineChart.data.datasets[1].data = cumulativeReports;
      timelineChart.update();
    } else {
      timelineChart = new Chart(timelineChartElement, {
        type: 'line',
        data: {
          labels: dates,
          datasets: [
            {
              label: 'Cumulative Writeups',
              data: cumulativeWriteups,
              borderColor: 'rgba(75, 192, 192, 0.6)',
              backgroundColor: 'rgba(75, 192, 192, 0.2)',
              fill: true,
            },
            {
              label: 'Cumulative Reports',
              data: cumulativeReports,
              borderColor: 'rgba(255, 99, 132, 0.6)',
              backgroundColor: 'rgba(255, 99, 132, 0.2)',
              fill: true,
            },
          ],
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
            },
          },
        },
      });
    }
  }

  const gamificationModule = (() => {
    let xp = 0;
    let level = 1;
    const xpPerLevel = 50;

    function addXP(amount) {
      xp += amount;
      if (xp >= xpPerLevel * level) {
        levelUp();
      }
      updateGamificationDisplay();
      saveProgress();
    }

    function levelUp() {
      level++;
      celebrationModule.celebrate();
    }

    function updateGamificationDisplay() {
      document.getElementById('user-xp').textContent = xp;
      document.getElementById('user-level').textContent = level;
      document.querySelector('.xp-progress').style.width = `${(xp % xpPerLevel) / xpPerLevel * 100}%`;
    }

    function saveProgress() {
      withDB((db) => {
        const transaction = db.transaction(['gamificationData'], 'readwrite');
        const store = transaction.objectStore('gamificationData');
        store.put({ key: 'xp', value: xp });
        store.put({ key: 'level', value: level });
      });
    }

    function loadProgress() {
      withDB((db) => {
        const transaction = db.transaction(['gamificationData'], 'readonly');
        const store = transaction.objectStore('gamificationData');

        store.get('xp').onsuccess = (event) => {
          xp = event.target.result ? event.target.result.value : 0;
          updateGamificationDisplay();
        };

        store.get('level').onsuccess = (event) => {
          level = event.target.result ? event.target.result.value : 1;
          updateGamificationDisplay();
        };
      });
    }

    return {
      addXP,
      updateGamificationDisplay,
      loadProgress
    };
  })();

  const celebrationModule = (() => {
    function createConfetti() {
      const confettiCount = 200;
      const colors = ['#fce18a', '#ff726d', '#b48def', '#f4306d'];

      for (let i = 0; i < confettiCount; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.animationDuration = (Math.random() * 3 + 2) + 's';
        confetti.style.opacity = Math.random();
        confetti.style.transform = 'rotate(' + Math.random() * 360 + 'deg)';
        document.body.appendChild(confetti);
        confetti.addEventListener('animationend', () => confetti.remove());
      }
    }

    function celebrate() {
      createConfetti();
      playSound();
      showCongratulationsMessage();
      setTimeout(() => document.querySelectorAll('.confetti').forEach(c => c.remove()), 5000);
    }

    function playSound() {
      document.getElementById('applause-sound').play();
    }

    function showCongratulationsMessage() {
      const message = document.createElement('div');
      message.className = 'congratulations-message';
      message.textContent = 'Congratulations! You leveled up!';
      document.body.appendChild(message);
      setTimeout(() => message.remove(), 5000);
    }

    return { celebrate };
  })();

  const streakModule = (() => {
    let currentStreak = 0;
    let longestStreak = 0;
    let lastReadDate = null;

    function updateStreak(date) {
      const today = new Date().toISOString().split('T')[0];
      date = date || today;

      if (!lastReadDate) currentStreak = 1;
      else {
        const diffDays = Math.floor((new Date(date) - new Date(lastReadDate)) / (1000 * 60 * 60 * 24));
        if (diffDays === 1 || (diffDays === 0 && date !== lastReadDate)) currentStreak++;
        else if (diffDays > 1) currentStreak = 1;
      }

      lastReadDate = date;
      longestStreak = Math.max(longestStreak, currentStreak);
      saveStreakData();
      updateStreakDisplay();
    }

    function saveStreakData() {
      withDB((db) => {
        const transaction = db.transaction(['gamificationData'], 'readwrite');
        const store = transaction.objectStore('gamificationData');
        store.put({ key: 'currentStreak', value: currentStreak });
        store.put({ key: 'longestStreak', value: longestStreak });
        store.put({ key: 'lastReadDate', value: lastReadDate });
      });
    }

    function loadStreakData() {
      withDB((db) => {
        const transaction = db.transaction(['gamificationData'], 'readonly');
        const store = transaction.objectStore('gamificationData');

        store.get('currentStreak').onsuccess = (event) => {
          currentStreak = event.target.result ? event.target.result.value : 0;
          updateStreakDisplay();
        };

        store.get('longestStreak').onsuccess = (event) => {
          longestStreak = event.target.result ? event.target.result.value : 0;
          updateStreakDisplay();
        };

        store.get('lastReadDate').onsuccess = (event) => {
          lastReadDate = event.target.result ? event.target.result.value : null;
          updateStreakDisplay();
        };
      });
    }

    function updateStreakDisplay() {
      document.getElementById('current-streak').textContent = currentStreak;
      document.getElementById('longest-streak').textContent = longestStreak;
      updateCalendar();
    }

    function updateCalendar() {
      const calendarContainer = document.querySelector('.streak-calendar');
      calendarContainer.innerHTML = '';
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 29);

      for (let i = 0; i < 30; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(currentDate.getDate() + i);
        const dateString = currentDate.toISOString().split('T')[0];
        const dayElement = document.createElement('div');
        dayElement.classList.add('calendar-day');
        dayElement.textContent = currentDate.getDate();
        dayElement.classList.add(dateString === lastReadDate ? 'read' : 'empty');
        calendarContainer.appendChild(dayElement);
      }
    }

    return {
      updateStreak,
      loadStreakData,
    };
  })();
});
document.addEventListener('DOMContentLoaded', () => {
  const historyModal = document.getElementById('history-modal');
  const closeModal = document.querySelector('.close-modal');
  const viewHistoryButton = document.getElementById('view-history');
  const historyDateInput = document.getElementById('history-date');
  const historyList = document.getElementById('history-list');

  viewHistoryButton.addEventListener('click', () => {
    historyModal.style.display = 'block';
    loadHistory(getIndiaDate()); // Load today's progress
  });

  closeModal.addEventListener('click', () => {
    historyModal.style.display = 'none';
  });

  window.addEventListener('click', (event) => {
    if (event.target === historyModal) {
      historyModal.style.display = 'none';
    }
  });

  historyDateInput.addEventListener('change', () => {
    loadHistory(historyDateInput.value);
  });

  function loadHistory(date) {
    historyList.innerHTML = `<li>Loading...</li>`; // Show loading text

    withDB((db) => {
      const transaction = db.transaction(['dailyProgress'], 'readonly');
      const store = transaction.objectStore('dailyProgress');
      const request = store.get(date);

      request.onsuccess = (event) => {
        const data = event.target.result;
        historyList.innerHTML = data ? `<li>${data.url}</li>` : `<li>No progress found for this date.</li>`;
      };

      request.onerror = () => {
        historyList.innerHTML = `<li>Error fetching history.</li>`;
      };
    });
  }
});
