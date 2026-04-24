// ========== GLOBAL VARIABLES ==========
let allIncidents = [];
let allUsers = [];
let currentUser = null;
let currentSort = "newest";
let userLocation = null;
let map = null;
let mapMarkers = [];
let chartInstances = {};
let mediaRecorder = null;
let audioChunks = [];
let speechRecognition = null;
let refreshInterval = null;

// ========== INITIALIZATION ==========
document.addEventListener('deviceready', onDeviceReady, false);
window.addEventListener('load', onPageLoad);

function onPageLoad() {
    setTimeout(() => {
        const splash = document.getElementById('splashScreen');
        if (splash) splash.style.display = 'none';
        checkFirstLaunch();
    }, 3000);
}

function onDeviceReady() {
    console.log('ðŸš€ Device Ready - Ultimate Incident Reporter');
    initializeApp();
    setupEventListeners();
    loadAllData();
    checkLogin();
    startLiveUpdates();
    setupSpeechRecognition();
}

function initializeApp() {
    // Load theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        document.getElementById('themeToggle').innerHTML = '<i class="fas fa-sun"></i>';
    }
    
    // Load notification preference
    const notificationsEnabled = localStorage.getItem('notificationsEnabled') !== 'false';
    document.getElementById('notificationsToggle').checked = notificationsEnabled;
    
    // Initialize map if needed
    if (document.getElementById('incidentMap')) {
        initMap();
    }
    
    // Start checking for updates
    startPeriodicRefresh();
}

function setupEventListeners() {
    // Auth
    document.getElementById('loginBtn')?.addEventListener('click', login);
    document.getElementById('registerBtn')?.addEventListener('click', () => showScreen('registerScreen'));
    document.getElementById('registerSubmitBtn')?.addEventListener('click', registerUser);
    document.getElementById('backToLoginBtn')?.addEventListener('click', () => showScreen('loginScreen'));
    document.getElementById('guestBtn')?.addEventListener('click', guestLogin);
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    
    // Theme
    document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);
    
    // User dropdown
    document.getElementById('userAvatar')?.addEventListener('click', toggleDropdown);
    
    // Report form
    document.getElementById('submitBtn')?.addEventListener('click', submitIncident);
    document.getElementById('takePhotoBtn')?.addEventListener('click', takePhoto);
    document.getElementById('selectPhotoBtn')?.addEventListener('click', selectPhoto);
    document.getElementById('recordVideoBtn')?.addEventListener('click', recordVideo);
    document.getElementById('recordAudioBtn')?.addEventListener('click', recordAudio);
    document.getElementById('locationCard')?.addEventListener('click', getLocation);
    document.getElementById('refreshLocationBtn')?.addEventListener('click', getLocation);
    
    // Category radio buttons
    document.querySelectorAll('.category-option').forEach(opt => {
        opt.addEventListener('click', function() {
            document.querySelectorAll('.category-option').forEach(o => o.classList.remove('selected'));
            this.classList.add('selected');
            this.querySelector('input').checked = true;
        });
    });
    
    // Tags input
    document.getElementById('tagsInput')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const tag = this.value.trim();
            if (tag) addTag(tag);
            this.value = '';
        }
    });
    
    // Search and filter
    document.getElementById('searchInput')?.addEventListener('input', searchIncidents);
    document.getElementById('voiceSearchBtn')?.addEventListener('click', startVoiceSearch);
    
    // Tabs
    document.querySelectorAll('.tab-item').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.getAttribute('data-tab')));
    });
    
    // Sort buttons
    document.querySelectorAll('.sort-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentSort = btn.getAttribute('data-sort');
            loadIncidents();
        });
    });
    
    // FAB and bottom sheet
    document.getElementById('fabBtn')?.addEventListener('click', toggleBottomSheet);
    document.querySelector('.sheet-overlay')?.addEventListener('click', toggleBottomSheet);
    
    // Sheet actions
    document.querySelectorAll('.sheet-action').forEach(action => {
        action.addEventListener('click', () => {
            toggleBottomSheet();
            const actionType = action.getAttribute('data-action');
            if (actionType === 'report') switchTab('report');
            else if (actionType === 'emergency') triggerEmergencySOS();
            else if (actionType === 'nearby') showNearbyAlerts();
            else if (actionType === 'share') shareApp();
        });
    });
    
    // Map controls
    document.getElementById('zoomToUserBtn')?.addEventListener('click', zoomToUser);
    document.getElementById('heatmapToggleBtn')?.addEventListener('click', toggleHeatmap);
    document.getElementById('refreshMapBtn')?.addEventListener('click', refreshMap);
    
    // Analytics
    document.getElementById('analyticsTimeframe')?.addEventListener('change', updateAnalytics);
    
    // Settings
    document.getElementById('notificationsToggle')?.addEventListener('change', (e) => {
        localStorage.setItem('notificationsEnabled', e.target.checked);
        showToast(`Notifications ${e.target.checked ? 'enabled' : 'disabled'}`, 'info');
    });
    
    document.getElementById('privacyToggle')?.addEventListener('change', (e) => {
        showToast(`Privacy mode ${e.target.checked ? 'on' : 'off'}`, 'info');
    });
    
    document.getElementById('offlineToggle')?.addEventListener('change', (e) => {
        if (e.target.checked) enableOfflineMode();
        else disableOfflineMode();
    });
    
    document.getElementById('changeAvatarBtn')?.addEventListener('click', changeAvatar);
    
    // Emergency SOS
    document.getElementById('confirmSosBtn')?.addEventListener('click', sendEmergencyAlert);
    document.getElementById('cancelSosBtn')?.addEventListener('click', () => closeModal('emergencyModal'));
}

// ========== ONBOARDING ==========
function checkFirstLaunch() {
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
    if (!hasSeenOnboarding) {
        showScreen('onboardingScreen');
        setupOnboarding();
    } else {
        showScreen('loginScreen');
    }
}

function setupOnboarding() {
    let currentSlide = 0;
    const slides = document.querySelectorAll('.onboarding-slide');
    const dots = document.querySelectorAll('.dot');
    const nextBtn = document.getElementById('onboardingNextBtn');
    const skipBtn = document.getElementById('onboardingSkipBtn');
    
    function showSlide(index) {
        slides.forEach((slide, i) => {
            slide.classList.toggle('active', i === index);
            dots[i]?.classList.toggle('active', i === index);
        });
    }
    
    nextBtn.addEventListener('click', () => {
        if (currentSlide < slides.length - 1) {
            currentSlide++;
            showSlide(currentSlide);
        } else {
            localStorage.setItem('hasSeenOnboarding', 'true');
            showScreen('loginScreen');
        }
    });
    
    skipBtn.addEventListener('click', () => {
        localStorage.setItem('hasSeenOnboarding', 'true');
        showScreen('loginScreen');
    });
}

// ========== AUTHENTICATION ==========
function registerUser() {
    const username = document.getElementById('regUsername').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirm = document.getElementById('regConfirmPassword').value;
    
    if (!username || !email || !password) {
        showRegisterStatus('Please fill all fields', 'error');
        return;
    }
    
    if (password !== confirm) {
        showRegisterStatus('Passwords do not match', 'error');
        return;
    }
    
    if (allUsers.some(u => u.username === username)) {
        showRegisterStatus('Username already exists', 'error');
        return;
    }
    
    const newUser = {
        id: 'user_' + Date.now(),
        username: username,
        email: email,
        password: password,
        joinDate: new Date().toISOString(),
        points: 0,
        reports: 0,
        likes: 0,
        achievements: []
    };
    
    allUsers.push(newUser);
    localStorage.setItem('users', JSON.stringify(allUsers));
    showRegisterStatus('Account created! Please login.', 'success');
    setTimeout(() => showScreen('loginScreen'), 1500);
}

function login() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    const user = allUsers.find(u => u.username === username && u.password === password);
    
    if (user) {
        currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        updateUIForUser();
        showToast(`Welcome back, ${username}!`, 'success');
        showScreen('appScreen');
        loadIncidents();
        loadMyIncidents();
        updateAnalytics();
        updateAchievements();
    } else {
        showStatus('Invalid username or password', 'error');
    }
}

function guestLogin() {
    currentUser = {
        id: 'guest_' + Date.now(),
        username: 'Guest',
        isGuest: true
    };
    updateUIForUser();
    showScreen('appScreen');
    loadIncidents();
}

function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    showScreen('loginScreen');
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    showToast('Logged out successfully', 'info');
}

function updateUIForUser() {
    document.getElementById('currentUserName').innerText = currentUser.username;
    document.getElementById('userPoints').innerText = currentUser.points || 0;
    document.getElementById('profileUsername').innerText = currentUser.username;
    document.getElementById('profileJoinDate').innerText = `Member since ${new Date(currentUser.joinDate).toLocaleDateString()}`;
}

// ========== DATA MANAGEMENT ==========
function loadAllData() {
    const savedIncidents = localStorage.getItem('incidents');
    if (savedIncidents) allIncidents = JSON.parse(savedIncidents);
    else loadDemoIncidents();
    
    const savedUsers = localStorage.getItem('users');
    if (savedUsers) allUsers = JSON.parse(savedUsers);
    else {
        allUsers = [{
            id: 'admin1',
            username: 'Admin',
            email: 'admin@test.com',
            password: 'admin123',
            joinDate: new Date().toISOString(),
            points: 100,
            reports: 5,
            likes: 20
        }];
        localStorage.setItem('users', JSON.stringify(allUsers));
    }
}

function loadDemoIncidents() {
    allIncidents = [
        {
            id: 1,
            title: 'Multi-Vehicle Accident on Main Highway',
            desc: 'Three cars collided near Exit 45. Multiple injuries reported. Police and ambulance on scene. Traffic backed up for 2 miles.',
            category: 'Accident',
            severity: 'High',
            lat: 6.5244,
            lng: 3.3792,
            date: new Date().toISOString(),
            reportedBy: 'JohnDoe',
            userId: 'demo1',
            likes: 24,
            comments: 5,
            tags: ['traffic', 'accident', 'police']
        },
        {
            id: 2,
            title: 'Large Fight Outside Nightclub',
            desc: 'Group of 10+ people fighting. Security trying to intervene. Police en route.',
            category: 'Fighting',
            severity: 'Medium',
            lat: 6.5225,
            lng: 3.3712,
            date: new Date(Date.now() - 3600000).toISOString(),
            reportedBy: 'JaneSmith',
            userId: 'demo2',
            likes: 12,
            comments: 3,
            tags: ['nightclub', 'fight', 'security']
        },
        {
            id: 3,
            title: 'Protest Turns Violent Downtown',
            desc: 'Peaceful protest escalated. Objects being thrown. Police in riot gear.',
            category: 'Rioting',
            severity: 'Critical',
            lat: 6.5312,
            lng: 3.3856,
            date: new Date(Date.now() - 7200000).toISOString(),
            reportedBy: 'MikeBrown',
            userId: 'demo3',
            likes: 56,
            comments: 12,
            tags: ['protest', 'riot', 'police']
        }
    ];
    localStorage.setItem('incidents', JSON.stringify(allIncidents));
}

// ========== INCIDENT DISPLAY ==========
function loadIncidents() {
    const listDiv = document.getElementById('incidentsList');
    if (!listDiv) return;
    
    let filtered = [...allIncidents];
    
    // Apply search
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase();
    if (searchTerm) {
        filtered = filtered.filter(i => 
            i.title.toLowerCase().includes(searchTerm) || 
            i.desc.toLowerCase().includes(searchTerm) ||
            i.tags?.some(t => t.toLowerCase().includes(searchTerm))
        );
    }
    
    // Apply sorting
    if (currentSort === 'newest') filtered.sort((a,b) => new Date(b.date) - new Date(a.date));
    else if (currentSort === 'popular') filtered.sort((a,b) => (b.likes || 0) - (a.likes || 0));
    else if (currentSort === 'nearby' && userLocation) {
        filtered.sort((a,b) => {
            const distA = getDistance(userLocation.lat, userLocation.lng, a.lat, a.lng);
            const distB = getDistance(userLocation.lat, userLocation.lng, b.lat, b.lng);
            return distA - distB;
        });
    }
    
    if (filtered.length === 0) {
        listDiv.innerHTML = '<div class="no-results">No incidents found</div>';
        return;
    }
    
    let html = '';
    filtered.forEach(inc => {
        const date = new Date(inc.date);
        const timeAgo = getTimeAgo(date);
        const severityColor = getSeverityColor(inc.severity);
        
        html += `
            <div class="incident-card" data-id="${inc.id}">
                <div class="card-header">
                    <span class="category-badge" style="background: ${getCategoryColor(inc.category)}">${inc.category}</span>
                    <span class="severity-badge" style="background: ${severityColor}">${inc.severity || 'Medium'}</span>
                </div>
                <h3>${escapeHtml(inc.title)}</h3>
                <p>${escapeHtml(inc.desc.substring(0, 120))}${inc.desc.length > 120 ? '...' : ''}</p>
                <div class="card-meta">
                    <span><i class="fas fa-user"></i> ${escapeHtml(inc.reportedBy)}</span>
                    <span><i class="fas fa-clock"></i> ${timeAgo}</span>
                    <span><i class="fas fa-map-marker-alt"></i> ${inc.lat.toFixed(4)}, ${inc.lng.toFixed(4)}</span>
                </div>
                <div class="card-tags">
                    ${inc.tags?.map(tag => `<span class="tag-mini">#${tag}</span>`).join('') || ''}
                </div>
                <div class="card-actions">
                    <button class="like-btn" data-id="${inc.id}"><i class="fas fa-heart"></i> ${inc.likes || 0}</button>
                    <button class="comment-btn" data-id="${inc.id}"><i class="fas fa-comment"></i> ${inc.comments || 0}</button>
                    <button class="share-btn" data-id="${inc.id}"><i class="fas fa-share"></i> Share</button>
                    <button class="navigate-btn" data-lat="${inc.lat}" data-lng="${inc.lng}"><i class="fas fa-directions"></i> Navigate</button>
                </div>
            </div>
        `;
    });
    
    listDiv.innerHTML = html;
    
    // Attach event listeners
    document.querySelectorAll('.like-btn').forEach(btn => {
        btn.addEventListener('click', () => likeIncident(parseInt(btn.dataset.id)));
    });
    document.querySelectorAll('.share-btn').forEach(btn => {
        btn.addEventListener('click', () => shareIncident(parseInt(btn.dataset.id)));
    });
    document.querySelectorAll('.navigate-btn').forEach(btn => {
        btn.addEventListener('click', () => navigateToLocation(btn.dataset.lat, btn.dataset.lng));
    });
    document.querySelectorAll('.comment-btn').forEach(btn => {
        btn.addEventListener('click', () => showComments(parseInt(btn.dataset.id)));
    });
    
    updateLiveStats();
}

function loadMyIncidents() {
    const myList = document.getElementById('myIncidentsList');
    if (!myList || !currentUser) return;
    
    const myIncidents = allIncidents.filter(i => i.userId === currentUser.id);
    
    document.getElementById('profileReports').innerText = myIncidents.length;
    document.getElementById('profileLikes').innerText = myIncidents.reduce((sum, i) => sum + (i.likes || 0), 0);
    document.getElementById('profilePoints').innerText = currentUser.points || 0;
    
    if (myIncidents.length === 0) {
        myList.innerHTML = '<div class="no-results">You haven\'t reported any incidents yet</div>';
        return;
    }
    
    let html = '';
    myIncidents.forEach(inc => {
        html += `
            <div class="incident-card">
                <div class="card-header">
                    <span class="category-badge">${inc.category}</span>
                    <span>${new Date(inc.date).toLocaleDateString()}</span>
                </div>
                <h3>${escapeHtml(inc.title)}</h3>
                <p>${escapeHtml(inc.desc)}</p>
                <small><i class="fas fa-heart"></i> ${inc.likes || 0} likes</small>
            </div>
        `;
    });
    myList.innerHTML = html;
}

// ========== SUBMIT INCIDENT ==========
function submitIncident() {
    const category = document.querySelector('input[name="category"]:checked')?.value;
    const title = document.getElementById('incidentTitle').value.trim();
    const desc = document.getElementById('incidentDesc').value.trim();
    const severity = document.getElementById('severitySlider').value;
    const lat = document.getElementById('lat').value;
    const lng = document.getElementById('lng').value;
    const mediaData = document.getElementById('mediaData').value;
    const tags = getTags();
    
    if (!category || !title || !desc) {
        showToast('Please fill all required fields', 'error');
        return;
    }
    
    const severityMap = {1: 'Low', 2: 'Medium', 3: 'High', 4: 'Critical'};
    
    const newIncident = {
        id: Date.now(),
        title: title,
        desc: desc,
        category: category,
        severity: severityMap[severity],
        lat: parseFloat(lat) || 6.5244,
        lng: parseFloat(lng) || 3.3792,
        date: new Date().toISOString(),
        reportedBy: currentUser?.username || 'Anonymous',
        userId: currentUser?.id || 'guest',
        media: mediaData || null,
        mediaType: document.getElementById('mediaType').value || null,
        likes: 0,
        comments: 0,
        tags: tags,
        views: 0
    };
    
    allIncidents.unshift(newIncident);
    localStorage.setItem('incidents', JSON.stringify(allIncidents));
    
    // Award points
    if (currentUser && !currentUser.isGuest) {
        currentUser.points = (currentUser.points || 0) + 10;
        currentUser.reports = (currentUser.reports || 0) + 1;
        const userIndex = allUsers.findIndex(u => u.id === currentUser.id);
        if (userIndex !== -1) allUsers[userIndex] = currentUser;
        localStorage.setItem('users', JSON.stringify(allUsers));
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        updateUIForUser();
        checkAchievements();
    }
    
    // Send notification
    sendPushNotification(`New ${category} incident reported nearby!`);
    showToast('âœ… Incident reported! +10 points!', 'success');
    
    // Reset form
    document.getElementById('reportForm').reset();
    document.getElementById('mediaPreview').innerHTML = '';
    document.getElementById('tagsContainer').innerHTML = '';
    document.getElementById('locationPreview').innerHTML = '';
    
    loadIncidents();
    updateMapMarkers();
    updateAnalytics();
    
    if (currentUser && !currentUser.isGuest) {
        loadMyIncidents();
    }
    
    switchTab('feed');
}

// ========== MAP FEATURES ==========
function initMap() {
    map = L.map('incidentMap').setView([6.5244, 3.3792], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: 'Â© OpenStreetMap contributors'
    }).addTo(map);
    
    updateMapMarkers();
}

function updateMapMarkers() {
    if (!map) return;
    
    mapMarkers.forEach(marker => map.removeLayer(marker));
    mapMarkers = [];
    
    allIncidents.forEach(incident => {
        const color = getCategoryColor(incident.category);
        const marker = L.circleMarker([incident.lat, incident.lng], {
            radius: 8,
            fillColor: color,
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
        }).addTo(map);
        
        marker.bindPopup(`
            <b>${incident.title}</b><br>
            ${incident.category}<br>
            ${new Date(incident.date).toLocaleString()}
        `);
        
        marker.on('click', () => {
            document.getElementById('selectedIncidentInfo').innerHTML = `
                <div class="selected-info-content">
                    <h4>${incident.title}</h4>
                    <p>${incident.desc}</p>
                    <button onclick="navigateToLocation(${incident.lat}, ${incident.lng})">
                        <i class="fas fa-directions"></i> Get Directions
                    </button>
                </div>
            `;
        });
        
        mapMarkers.push(marker);
    });
}

function zoomToUser() {
    if (userLocation) {
        map.setView([userLocation.lat, userLocation.lng], 15);
    } else {
        getLocation();
    }
}

function toggleHeatmap() {
    showToast('Heatmap feature coming soon!', 'info');
}

function refreshMap() {
    updateMapMarkers();
    showToast('Map refreshed', 'success');
}

function navigateToLocation(lat, lng) {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_blank');
}

// ========== LOCATION ==========
function getLocation() {
    const statusSpan = document.getElementById('locationStatus');
    statusSpan.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Getting location...';
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                document.getElementById('lat').value = userLocation.lat;
                document.getElementById('lng').value = userLocation.lng;
                statusSpan.innerHTML = '<i class="fas fa-check-circle"></i> Location captured!';
                
                // Reverse geocoding
                fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLocation.lat}&lon=${userLocation.lng}`)
                    .then(res => res.json())
                    .then(data => {
                        document.getElementById('locationPreview').innerHTML = `
                            <i class="fas fa-location-dot"></i> 
                            ${data.display_name?.substring(0, 100) || 'Address found'}
                        `;
                    })
                    .catch(() => {});
            },
            error => {
                statusSpan.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Using default location';
                document.getElementById('lat').value = '6.5244';
                document.getElementById('lng').value = '3.3792';
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    } else {
        statusSpan.innerHTML = '<i class="fas fa-ban"></i> Location not supported';
    }
}

// ========== MEDIA CAPTURE ==========
function takePhoto() {
    if (navigator.camera) {
        navigator.camera.getPicture(
            imageData => {
                document.getElementById('mediaData').value = imageData;
                document.getElementById('mediaType').value = 'photo';
                document.getElementById('mediaPreview').innerHTML = `
                    <img src="data:image/jpeg;base64,${imageData}">
                    <button class="remove-media" onclick="document.getElementById('mediaPreview').innerHTML=''"><i class="fas fa-times"></i></button>
                `;
            },
            err => showToast('Camera error', 'error'),
            {
                quality: 80,
                destinationType: Camera.DestinationType.DATA_URL,
                sourceType: Camera.PictureSourceType.CAMERA,
                encodingType: Camera.EncodingType.JPEG,
                saveToPhotoAlbum: true
            }
        );
    } else {
        showToast('Camera will work in installed app', 'info');
    }
}

function selectPhoto() {
    if (navigator.camera) {
        navigator.camera.getPicture(
            imageData => {
                document.getElementById('mediaData').value = imageData;
                document.getElementById('mediaType').value = 'photo';
                document.getElementById('mediaPreview').innerHTML = `
                    <img src="data:image/jpeg;base64,${imageData}">
                    <button class="remove-media" onclick="document.getElementById('mediaPreview').innerHTML=''"><i class="fas fa-times"></i></button>
                `;
            },
            err => showToast('Gallery error', 'error'),
            {
                quality: 80,
                destinationType: Camera.DestinationType.DATA_URL,
                sourceType: Camera.PictureSourceType.PHOTOLIBRARY
            }
        );
    }
}

function recordVideo() {
    showToast('Video recording - tap again to stop', 'info');
    // Implementation would use cordova-plugin-media-capture
}

function recordAudio() {
    showToast('Audio note feature coming soon', 'info');
}

// ========== TAGS SYSTEM ==========
function addTag(tag) {
    const tagsContainer = document.getElementById('tagsContainer');
    const tagElement = document.createElement('span');
    tagElement.className = 'tag';
    tagElement.innerHTML = `${escapeHtml(tag)} <i class="fas fa-times" onclick="this.parentElement.remove()"></i>`;
    tagsContainer.appendChild(tagElement);
}

function getTags() {
    const tags = [];
    document.querySelectorAll('#tagsContainer .tag').forEach(tag => {
        tags.push(tag.innerText.replace('Ã—', '').trim());
    });
    return tags;
}

// ========== SOCIAL FEATURES ==========
function likeIncident(incidentId) {
    const incident = allIncidents.find(i => i.id === incidentId);
    if (incident) {
        incident.likes = (incident.likes || 0) + 1;
        localStorage.setItem('incidents', JSON.stringify(allIncidents));
        loadIncidents();
        showToast('You liked this incident!', 'success');
        
        // Award points for liking (optional)
        if (currentUser && !currentUser.isGuest) {
            currentUser.likes = (currentUser.likes || 0) + 1;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        }
    }
}

function shareIncident(incidentId) {
    const incident = allIncidents.find(i => i.id === incidentId);
    if (incident && navigator.share) {
        navigator.share({
            title: incident.title,
            text: incident.desc,
            url: `https://maps.google.com/?q=${incident.lat},${incident.lng}`
        });
    } else {
        navigator.clipboard.writeText(`Check out this incident: ${incident.title} - https://maps.google.com/?q=${incident.lat},${incident.lng}`);
        showToast('Link copied to clipboard!', 'success');
    }
}

function showComments(incidentId) {
    showToast('Comments feature coming soon!', 'info');
}

// ========== ANALYTICS ==========
function updateAnalytics() {
    const timeframe = document.getElementById('analyticsTimeframe')?.value || 'week';
    const now = new Date();
    let startDate;
    
    if (timeframe === 'week') startDate = new Date(now.setDate(now.getDate() - 7));
    else if (timeframe === 'month') startDate = new Date(now.setMonth(now.getMonth() - 1));
    else startDate = new Date(now.setFullYear(now.getFullYear() - 1));
    
    const filtered = allIncidents.filter(i => new Date(i.date) > startDate);
    
    // Incident trend by category
    const categoryCount = {};
    filtered.forEach(i => {
        categoryCount[i.category] = (categoryCount[i.category] || 0) + 1;
    });
    
    // Create charts
    const ctx1 = document.getElementById('incidentChart')?.getContext('2d');
    const ctx2 = document.getElementById('categoryChart')?.getContext('2d');
    const ctx3 = document.getElementById('trendChart')?.getContext('2d');
    
    if (ctx1 && !chartInstances.incident) {
        chartInstances.incident = new Chart(ctx1, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Incidents',
                    data: [5, 8, 12, 7, 15, 20, 10],
                    borderColor: '#e94560',
                    tension: 0.4,
                    fill: true,
                    backgroundColor: 'rgba(233,69,96,0.1)'
                }]
            },
            options: { responsive: true }
        });
    }
    
    if (ctx2 && !chartInstances.category) {
        chartInstances.category = new Chart(ctx2, {
            type: 'doughnut',
            data: {
                labels: Object.keys(categoryCount),
                datasets: [{
                    data: Object.values(categoryCount),
                    backgroundColor: ['#ff9800', '#f44336', '#9c27b0', '#ff5722', '#4caf50', '#2196f3']
                }]
            },
            options: { responsive: true }
        });
    }
    
    // Leaderboard
    const userIncidents = {};
    allIncidents.forEach(i => {
        userIncidents[i.reportedBy] = (userIncidents[i.reportedBy] || 0) + 1;
    });
    const sorted = Object.entries(userIncidents).sort((a,b) => b[1] - a[1]).slice(0,5);
    
    const leaderboardHtml = sorted.map(([user, count], idx) => `
        <div class="leaderboard-item">
            <span>${idx + 1}. ${user}</span>
            <span>${count} reports</span>
        </div>
    `).join('');
    document.getElementById('leaderboardList').innerHTML = leaderboardHtml;
    
    // Hotspots
    const hotspots = allIncidents.filter(i => {
        const date = new Date(i.date);
        return (new Date() - date) < 86400000;
    }).slice(0,5);
    
    const hotspotsHtml = hotspots.map(i => `
        <div class="hotspot-item">
            <span>ðŸ”¥ ${i.category}</span>
            <span>${i.title.substring(0, 30)}...</span>
        </div>
    `).join('');
    document.getElementById('hotspotsList').innerHTML = hotspotsHtml;
}

// ========== ACHIEVEMENTS ==========
const achievementsList = [
    { id: 'first_report', name: 'First Responder', icon: 'ðŸŽ–ï¸', requirement: 'Submit first report' },
    { id: '10_reports', name: 'Community Watch', icon: 'ðŸ‘ï¸', requirement: 'Submit 10 reports' },
    { id: '50_reports', name: 'Guardian Angel', icon: 'ðŸ‘¼', requirement: 'Submit 50 reports' },
    { id: '100_likes', name: 'Influencer', icon: 'â­', requirement: 'Receive 100 likes' },
    { id: 'night_owl', name: 'Night Watch', icon: 'ðŸ¦‰', requirement: 'Submit report after midnight' },
    { id: 'early_bird', name: 'Morning Guardian', icon: 'ðŸ¦', requirement: 'Submit report before 6 AM' }
];

function updateAchievements() {
    if (!currentUser) return;
    
    const unlocked = currentUser.achievements || [];
    const html = achievementsList.map(ach => `
        <div class="achievement-card ${unlocked.includes(ach.id) ? 'unlocked' : ''}">
            <div>${ach.icon}</div>
            <div>${ach.name}</div>
            <small>${ach.requirement}</small>
        </div>
    `).join('');
    
    document.getElementById('achievementsList').innerHTML = html;
}

function checkAchievements() {
    if (!currentUser || currentUser.isGuest) return;
    
    const unlocked = currentUser.achievements || [];
    const reports = currentUser.reports || 0;
    const likes = currentUser.likes || 0;
    
    if (reports >= 1 && !unlocked.includes('first_report')) {
        unlockAchievement('first_report');
    }
    if (reports >= 10 && !unlocked.includes('10_reports')) {
        unlockAchievement('10_reports');
    }
    if (reports >= 50 && !unlocked.includes('50_reports')) {
        unlockAchievement('50_reports');
    }
    if (likes >= 100 && !unlocked.includes('100_likes')) {
        unlockAchievement('100_likes');
    }
}

function unlockAchievement(achievementId) {
    if (!currentUser) return;
    
    currentUser.achievements = currentUser.achievements || [];
    if (!currentUser.achievements.includes(achievementId)) {
        currentUser.achievements.push(achievementId);
        currentUser.points = (currentUser.points || 0) + 50;
        
        const userIndex = allUsers.findIndex(u => u.id === currentUser.id);
        if (userIndex !== -1) allUsers[userIndex] = currentUser;
        localStorage.setItem('users', JSON.stringify(allUsers));
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        updateUIForUser();
        updateAchievements();
        
        const achievement = achievementsList.find(a => a.id === achievementId);
        showToast(`ðŸ† Achievement Unlocked: ${achievement.name}! +50 points!`, 'success');
        sendPushNotification(`You earned the ${achievement.name} achievement!`);
    }
}

// ========== VOICE SEARCH ==========
function setupSpeechRecognition() {
    if ('webkitSpeechRecognition' in window) {
        speechRecognition = new webkitSpeechRecognition();
        speechRecognition.continuous = false;
        speechRecognition.lang = 'en-US';
        speechRecognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            document.getElementById('searchInput').value = transcript;
            searchIncidents();
        };
    }
}

function startVoiceSearch() {
    if (speechRecognition) {
        speechRecognition.start();
        showToast('Listening... speak your search', 'info');
    } else {
        showToast('Voice search not supported', 'error');
    }
}

// ========== EMERGENCY SOS ==========
function triggerEmergencySOS() {
    openModal('emergencyModal');
    let countdown = 5;
    const timerDiv = document.getElementById('sosTimer');
    
    const interval = setInterval(() => {
        countdown--;
        timerDiv.innerText = countdown;
        if (countdown === 0) {
            clearInterval(interval);
            sendEmergencyAlert();
        }
    }, 1000);
}

function sendEmergencyAlert() {
    closeModal('emergencyModal');
    
    // Get current location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const message = `EMERGENCY SOS from ${currentUser?.username || 'Citizen'} at ${position.coords.latitude}, ${position.coords.longitude}`;
            
            // In production, send to backend/emergency services
            showToast('ðŸš¨ Emergency alert sent to authorities!', 'error');
            
            // Also share with nearby users (simulated)
            sendPushNotification('EMERGENCY: Someone needs help nearby!');
        });
    } else {
        showToast('ðŸš¨ Emergency alert sent! Stay safe.', 'error');
    }
}

// ========== NOTIFICATIONS ==========
function sendPushNotification(message) {
    const notificationsEnabled = localStorage.getItem('notificationsEnabled') !== 'false';
    if (!notificationsEnabled) return;
    
    if (navigator.notification) {
        navigator.notification.alert(message, null, 'Alert', 'OK');
    } else {
        showToast(message, 'info');
    }
    
    updateNotificationBadge();
}

function updateNotificationBadge() {
    const recentIncidents = allIncidents.filter(i => {
        const date = new Date(i.date);
        return (new Date() - date) < 86400000;
    }).length;
    
    const badge = document.getElementById('notificationCount');
    if (badge) {
        badge.innerText = recentIncidents;
        badge.style.display = recentIncidents > 0 ? 'flex' : 'none';
    }
    
    if (recentIncidents > 0) {
        document.querySelector('.fa-bell')?.classList.add('has-notification');
    }
}

function showNearbyAlerts() {
    if (userLocation) {
        const nearby = allIncidents.filter(i => {
            const dist = getDistance(userLocation.lat, userLocation.lng, i.lat, i.lng);
            return dist < 1; // Within 1km
        });
        showToast(`${nearby.length} incidents within 1km of you`, 'info');
    } else {
        getLocation();
    }
}

// ========== UI HELPERS ==========
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(screenId);
    if (target) {
        target.classList.add('active');
        if (screenId === 'appScreen') {
            loadIncidents();
            updateAnalytics();
            updateMapMarkers();
        }
    }
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
    document.querySelector(`.tab-item[data-tab="${tabId}"]`)?.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    const targetTab = document.getElementById(tabId + 'Tab');
    if (targetTab) {
        targetTab.classList.add('active');
        
        if (tabId === 'feed') loadIncidents();
        if (tabId === 'map') updateMapMarkers();
        if (tabId === 'analytics') updateAnalytics();
        if (tabId === 'profile') {
            updateAchievements();
            loadMyIncidents();
        }
    }
    
    toggleBottomSheet(false);
}

function toggleTheme() {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    document.getElementById('themeToggle').innerHTML = isLight ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
}

function toggleDropdown() {
    document.getElementById('userDropdown')?.classList.toggle('show');
}

function toggleBottomSheet(force) {
    const sheet = document.getElementById('bottomSheet');
    if (force === false || sheet.classList.contains('open')) {
        sheet.classList.remove('open');
    } else {
        sheet.classList.add('open');
    }
}

function openModal(modalId) {
    document.getElementById(modalId)?.classList.add('open');
}

function closeModal(modalId) {
    document.getElementById(modalId)?.classList.remove('open');
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function showStatus(message, type) {
    showToast(message, type);
}

function showRegisterStatus(message, type) {
    const div = document.getElementById('registerStatus');
    if (div) {
        div.innerText = message;
        div.className = `status-message ${type}`;
        setTimeout(() => div.innerText = '', 3000);
    }
}

function changeAvatar() {
    if (navigator.camera) {
        navigator.camera.getPicture(
            imageData => {
                document.getElementById('profileAvatar').innerHTML = `<img src="data:image/jpeg;base64,${imageData}" class="avatar-img"><button id="changeAvatarBtn" class="avatar-edit"><i class="fas fa-camera"></i></button>`;
                localStorage.setItem('userAvatar', imageData);
                showToast('Profile picture updated!', 'success');
            },
            err => showToast('Error', 'error'),
            { quality: 80, destinationType: Camera.DestinationType.DATA_URL, sourceType: Camera.PictureSourceType.PHOTOLIBRARY }
        );
    }
}

function shareApp() {
    if (navigator.share) {
        navigator.share({
            title: 'Incident Reporter Pro',
            text: 'Stay safe with real-time incident reporting!',
            url: 'https://github.com/your-repo'
        });
    } else {
        showToast('Share feature coming soon', 'info');
    }
}

function searchIncidents() {
    loadIncidents();
}

function updateLiveStats() {
    document.getElementById('liveIncidents').innerText = allIncidents.length;
    document.getElementById('liveUsers').innerText = Math.floor(Math.random() * 50) + 10;
    document.getElementById('userPoints').innerText = currentUser?.points || 0;
}

function startPeriodicRefresh() {
    refreshInterval = setInterval(() => {
        if (document.getElementById('feedTab')?.classList.contains('active')) {
            loadIncidents();
        }
        if (document.getElementById('analyticsTab')?.classList.contains('active')) {
            updateAnalytics();
        }
    }, 30000);
}

function startLiveUpdates() {
    setInterval(updateNotificationBadge, 60000);
}

function enableOfflineMode() {
    showToast('Offline mode enabled - using cached data', 'info');
}

function disableOfflineMode() {
    showToast('Online mode restored', 'success');
}

// ========== UTILITY FUNCTIONS ==========
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    const intervals = [
        { label: 'year', seconds: 31536000 },
        { label: 'month', seconds: 2592000 },
        { label: 'day', seconds: 86400 },
        { label: 'hour', seconds: 3600 },
        { label: 'minute', seconds: 60 }
    ];
    for (const interval of intervals) {
        const count = Math.floor(seconds / interval.seconds);
        if (count >= 1) return `${count} ${interval.label}${count > 1 ? 's' : ''} ago`;
    }
    return 'just now';
}

function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function getCategoryColor(category) {
    const colors = {
        'Accident': '#ff9800',
        'Fighting': '#f44336',
        'Rioting': '#9c27b0',
        'Fire': '#ff5722',
        'Theft': '#4caf50',
        'Medical': '#2196f3',
        'Other': '#607d8b'
    };
    return colors[category] || '#e94560';
}

function getSeverityColor(severity) {
    const colors = {
        'Low': '#4caf50',
        'Medium': '#ff9800',
        'High': '#ff5722',
        'Critical': '#f44336'
    };
    return colors[severity] || '#e94560';
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function checkLogin() {
    const saved = localStorage.getItem('currentUser');
    if (saved) {
        currentUser = JSON.parse(saved);
        updateUIForUser();
        showScreen('appScreen');
        loadIncidents();
        updateAnalytics();
    }
}

// Make functions global for HTML onclick
window.navigateToLocation = navigateToLocation;
