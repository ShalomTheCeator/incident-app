// ========== GLOBAL VARIABLES ==========
var allIncidents = [];
var currentUser = null;

// ========== INITIALIZATION ==========
document.addEventListener('deviceready', onDeviceReady, false);

function onDeviceReady() {
    console.log('Device ready - App initialized');
    loadDemoData();
    setupEventListeners();
    checkLogin();
}

// ========== EVENT LISTENERS ==========
function setupEventListeners() {
    document.getElementById('loginBtn').onclick = login;
    document.getElementById('guestBtn').onclick = guestLogin;
    document.getElementById('submitBtn').onclick = submitIncident;
    document.getElementById('takePhotoBtn').onclick = takePhoto;
    document.getElementById('selectPhotoBtn').onclick = selectPhoto;
    document.getElementById('locationBox').onclick = getLocation;
    document.getElementById('searchInput').oninput = searchIncidents;
    
    document.querySelectorAll('.tab').forEach(function(tab) {
        tab.onclick = function() {
            switchTab(this.getAttribute('data-tab'));
        };
    });
}

// ========== LOGIN FUNCTIONS ==========
function login() {
    var username = document.getElementById('username').value.trim();
    if (!username) {
        showStatus('Please enter username', 'error');
        return;
    }
    
    currentUser = {
        username: username,
        userId: 'user_' + Date.now()
    };
    
    localStorage.setItem('user', JSON.stringify(currentUser));
    showStatus('Login successful! Welcome ' + username, 'success');
    
    setTimeout(function() {
        showScreen('appScreen');
        loadIncidents();
        loadMyIncidents();
    }, 1000);
}

function guestLogin() {
    currentUser = {
        username: 'Guest',
        userId: 'guest_' + Date.now()
    };
    localStorage.setItem('user', JSON.stringify(currentUser));
    showScreen('appScreen');
    loadIncidents();
}

function checkLogin() {
    var saved = localStorage.getItem('user');
    if (saved) {
        currentUser = JSON.parse(saved);
        showScreen('appScreen');
        loadIncidents();
    }
}

function logout() {
    localStorage.removeItem('user');
    currentUser = null;
    showScreen('loginScreen');
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
}

// ========== SCREEN NAVIGATION ==========
function showScreen(screenId) {
    var screens = document.querySelectorAll('.screen');
    for (var i = 0; i < screens.length; i++) {
        screens[i].classList.remove('active');
    }
    document.getElementById(screenId).classList.add('active');
}

function switchTab(tabId) {
    var tabs = document.querySelectorAll('.tab');
    for (var i = 0; i < tabs.length; i++) {
        tabs[i].classList.remove('active');
        if (tabs[i].getAttribute('data-tab') === tabId) {
            tabs[i].classList.add('active');
        }
    }
    
    var contents = document.querySelectorAll('.tab-content');
    for (var i = 0; i < contents.length; i++) {
        contents[i].classList.remove('active');
    }
    document.getElementById(tabId + 'Tab').classList.add('active');
    
    if (tabId === 'myincidents') loadMyIncidents();
    if (tabId === 'incidents') loadIncidents();
    if (tabId === 'report') getLocation();
}

// ========== DATA MANAGEMENT ==========
function loadDemoData() {
    var saved = localStorage.getItem('incidents');
    if (saved) {
        allIncidents = JSON.parse(saved);
    } else {
        allIncidents = [
            {
                id: 1,
                title: 'Accident on Main Street',
                desc: 'Two cars collided at the intersection. Police are on scene. Traffic is blocked.',
                category: 'Accident',
                lat: '6.5244',
                lng: '3.3792',
                date: new Date().toISOString(),
                reportedBy: 'JohnDoe',
                userId: 'demo1'
            },
            {
                id: 2,
                title: 'Fighting at Shopping Mall',
                desc: 'Group fighting in the food court area. Security called.',
                category: 'Fighting',
                lat: '6.5225',
                lng: '3.3712',
                date: new Date(Date.now() - 3600000).toISOString(),
                reportedBy: 'JaneSmith',
                userId: 'demo2'
            },
            {
                id: 3,
                title: 'Protest on Highway',
                desc: 'Large group blocking traffic. Police on scene.',
                category: 'Rioting',
                lat: '6.5312',
                lng: '3.3856',
                date: new Date(Date.now() - 7200000).toISOString(),
                reportedBy: 'MikeBrown',
                userId: 'demo3'
            },
            {
                id: 4,
                title: 'Fire at Office Building',
                desc: 'Small fire on third floor. Fire department en route.',
                category: 'Fire',
                lat: '6.5289',
                lng: '3.3756',
                date: new Date(Date.now() - 10800000).toISOString(),
                reportedBy: 'SarahWilson',
                userId: 'demo4'
            }
        ];
        localStorage.setItem('incidents', JSON.stringify(allIncidents));
    }
}

function loadIncidents() {
    var listDiv = document.getElementById('incidentsList');
    
    if (allIncidents.length === 0) {
        listDiv.innerHTML = '<div class="no-results">No incidents reported yet</div>';
        return;
    }
    
    var html = '';
    var sorted = [...allIncidents].reverse();
    
    for (var i = 0; i < sorted.length; i++) {
        var inc = sorted[i];
        var date = new Date(inc.date);
        
        html += '<div class="incident-card" data-cat="' + inc.category + '">';
        html += '<div class="category ' + inc.category + '">' + inc.category + '</div>';
        html += '<h3>' + escapeHtml(inc.title) + '</h3>';
        html += '<p>' + escapeHtml(inc.desc) + '</p>';
        html += '<small><i class="fas fa-user"></i> ' + escapeHtml(inc.reportedBy) + ' | ';
        html += '<i class="fas fa-clock"></i> ' + date.toLocaleString() + '</small><br>';
        html += '<a href="https://maps.google.com/?q=' + inc.lat + ',' + inc.lng + '" target="_blank">';
        html += '<i class="fas fa-map-marker-alt"></i> View on Map</a>';
        if (inc.photo) {
            html += '<img src="' + inc.photo + '" class="incident-image" style="max-width:100%;margin-top:10px;border-radius:8px;">';
        }
        html += '</div>';
    }
    
    listDiv.innerHTML = html;
    setupFilters();
}

function loadMyIncidents() {
    var myList = document.getElementById('myIncidentsList');
    
    if (!currentUser) {
        myList.innerHTML = '<div class="no-results">Please login to see your reports</div>';
        return;
    }
    
    var myIncidents = [];
    for (var i = 0; i < allIncidents.length; i++) {
        if (allIncidents[i].userId === currentUser.userId) {
            myIncidents.push(allIncidents[i]);
        }
    }
    
    if (myIncidents.length === 0) {
        myList.innerHTML = '<div class="no-results">You haven\'t reported any incidents yet</div>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < myIncidents.length; i++) {
        var inc = myIncidents[i];
        var date = new Date(inc.date);
        
        html += '<div class="incident-card">';
        html += '<div class="category ' + inc.category + '">' + inc.category + '</div>';
        html += '<h3>' + escapeHtml(inc.title) + '</h3>';
        html += '<p>' + escapeHtml(inc.desc) + '</p>';
        html += '<small><i class="fas fa-clock"></i> ' + date.toLocaleString() + '</small>';
        html += '</div>';
    }
    
    myList.innerHTML = html;
}

function submitIncident() {
    var cat = document.getElementById('incidentCategory').value;
    var desc = document.getElementById('incidentDesc').value;
    var lat = document.getElementById('lat').value;
    var lng = document.getElementById('lng').value;
    var photo = document.getElementById('photoData').value;
    
    if (!cat || !desc) {
        showStatus('Please fill all fields', 'error');
        return;
    }
    
    var newIncident = {
        id: Date.now(),
        title: cat + ' Incident Reported',
        desc: desc,
        category: cat,
        lat: lat || '6.5244',
        lng: lng || '3.3792',
        date: new Date().toISOString(),
        reportedBy: currentUser ? currentUser.username : 'Anonymous',
        userId: currentUser ? currentUser.userId : 'guest',
        photo: photo || null
    };
    
    allIncidents.unshift(newIncident);
    localStorage.setItem('incidents', JSON.stringify(allIncidents));
    
    // Send notification
    if (navigator.notification) {
        navigator.notification.alert(
            'A new incident has been reported! Other users can now see it.',
            null,
            'Incident Reported',
            'OK'
        );
    } else {
        alert('✅ Incident reported! Other users can now view it.');
    }
    
    // Reset form
    document.getElementById('reportForm').reset();
    document.getElementById('photoPreview').innerHTML = '';
    document.getElementById('lat').value = '';
    document.getElementById('lng').value = '';
    document.getElementById('photoData').value = '';
    
    showStatus('Incident reported successfully!', 'success');
    loadIncidents();
    switchTab('incidents');
}

// ========== GEOLOCATION ==========
function getLocation() {
    var statusSpan = document.getElementById('locationStatus');
    statusSpan.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Getting location...';
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(pos) {
                document.getElementById('lat').value = pos.coords.latitude;
                document.getElementById('lng').value = pos.coords.longitude;
                statusSpan.innerHTML = '<i class="fas fa-check-circle"></i> Location captured!';
            },
            function(err) {
                statusSpan.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Using default location';
                document.getElementById('lat').value = '6.5244';
                document.getElementById('lng').value = '3.3792';
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    } else {
        statusSpan.innerHTML = '<i class="fas fa-ban"></i> Geolocation not supported';
        document.getElementById('lat').value = '6.5244';
        document.getElementById('lng').value = '3.3792';
    }
}

// ========== CAMERA & GALLERY ==========
function takePhoto() {
    if (navigator.camera) {
        navigator.camera.getPicture(
            function(imageData) {
                document.getElementById('photoData').value = imageData;
                document.getElementById('photoPreview').innerHTML = '<img src="data:image/jpeg;base64,' + imageData + '">';
            },
            function(err) {
                showStatus('Camera error: ' + err, 'error');
            },
            {
                quality: 70,
                destinationType: Camera.DestinationType.DATA_URL,
                sourceType: Camera.PictureSourceType.CAMERA,
                encodingType: Camera.EncodingType.JPEG,
                saveToPhotoAlbum: true
            }
        );
    } else {
        showStatus('Camera will work in the installed app', 'info');
    }
}

function selectPhoto() {
    if (navigator.camera) {
        navigator.camera.getPicture(
            function(imageData) {
                document.getElementById('photoData').value = imageData;
                document.getElementById('photoPreview').innerHTML = '<img src="data:image/jpeg;base64,' + imageData + '">';
            },
            function(err) {
                showStatus('Gallery error: ' + err, 'error');
            },
            {
                quality: 70,
                destinationType: Camera.DestinationType.DATA_URL,
                sourceType: Camera.PictureSourceType.PHOTOLIBRARY
            }
        );
    } else {
        showStatus('Gallery will work in the installed app', 'info');
    }
}

// ========== FILTERS & SEARCH ==========
function setupFilters() {
    var categories = [];
    for (var i = 0; i < allIncidents.length; i++) {
        var cat = allIncidents[i].category;
        if (categories.indexOf(cat) === -1) {
            categories.push(cat);
        }
    }
    
    var filterDiv = document.getElementById('categoryFilters');
    filterDiv.innerHTML = '<span class="filter-chip active" data-cat="all">All</span>';
    
    for (var i = 0; i < categories.length; i++) {
        filterDiv.innerHTML += '<span class="filter-chip" data-cat="' + categories[i] + '">' + categories[i] + '</span>';
    }
    
    var chips = document.querySelectorAll('.filter-chip');
    for (var i = 0; i < chips.length; i++) {
        chips[i].onclick = function() {
            var allChips = document.querySelectorAll('.filter-chip');
            for (var j = 0; j < allChips.length; j++) {
                allChips[j].classList.remove('active');
            }
            this.classList.add('active');
            
            var cat = this.getAttribute('data-cat');
            var cards = document.querySelectorAll('#incidentsList .incident-card');
            for (var k = 0; k < cards.length; k++) {
                var card = cards[k];
                if (cat === 'all' || card.getAttribute('data-cat') === cat) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            }
        };
    }
}

function searchIncidents() {
    var term = document.getElementById('searchInput').value.toLowerCase();
    var cards = document.querySelectorAll('#incidentsList .incident-card');
    
    for (var i = 0; i < cards.length; i++) {
        var card = cards[i];
        var text = card.innerText.toLowerCase();
        if (text.indexOf(term) !== -1) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    }
}

// ========== UTILITIES ==========
function showStatus(msg, type) {
    var div = document.getElementById('loginStatus');
    if (div) {
        div.innerText = msg;
        div.className = 'status-message ' + type;
        setTimeout(function() {
            div.innerText = '';
            div.className = 'status-message';
        }, 3000);
    } else {
        alert(msg);
    }
}

function escapeHtml(text) {
    if (!text) return '';
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
        }
