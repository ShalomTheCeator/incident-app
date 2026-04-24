// ========== GLOBAL VARIABLES ==========
let allIncidents = [];
let allUsers = [];
let currentUser = null;
let currentSort = "newest";
let userLocation = null;
let map = null;
let mapMarkers = [];
let chartInstances = {};
let refreshInterval = null;

// ========== INITIALIZATION ==========
document.addEventListener('deviceready', onDeviceReady, false);
window.addEventListener('load', onPageLoad);

function onPageLoad() {
    // Skip onboarding by default - go straight to login
    localStorage.setItem('hasSeenOnboarding', 'true');
    
    setTimeout(() => {
        const splash = document.getElementById('splashScreen');
        if (splash) splash.style.display = 'none';
        checkFirstLaunch();
    }, 1500);
}

function onDeviceReady() {
    console.log('Device Ready - Ultimate Incident Reporter');
    initializeApp();
    setupEventListeners();
    loadAllData();
    checkLogin();
    startLiveUpdates();
}

function initializeApp() {
    // Load theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
    
    // Load notification preference
    const notificationsEnabled = localStorage.getItem('notificationsEnabled') !== 'false';
    const notifToggle = document.getElementById('notificationsToggle');
    if (notifToggle) notifToggle.checked = notificationsEnabled;
}

// ========== ONBOARDING (Simplified & Working) ==========
function checkFirstLaunch() {
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
    if (hasSeenOnboarding === 'true') {
        showScreen('loginScreen');
    } else {
        showScreen('onboardingScreen');
        setupOnboarding();
    }
}

function setupOnboarding() {
    let currentSlide = 0;
    const slides = document.querySelectorAll('.onboarding-slide');
    const dots = document.querySelectorAll('.dot');
    const nextBtn = document.getElementById('onboardingNextBtn');
    const skipBtn = document.getElementById('onboardingSkipBtn');
    
    if (!slides.length) {
        showScreen('loginScreen');
        return;
    }
    
    function showSlide(index) {
        slides.forEach((slide, i) => {
            if (slide) slide.classList.toggle('active', i === index);
            if (dots[i]) dots[i].classList.toggle('active', i === index);
        });
    }
    
    if (nextBtn) {
        nextBtn.onclick = () => {
            if (currentSlide < slides.length - 1) {
                currentSlide++;
                showSlide(currentSlide);
            } else {
                localStorage.setItem('hasSeenOnboarding', 'true');
                showScreen('loginScreen');
            }
        };
    }
    
    if (skipBtn) {
        skipBtn.onclick = () => {
            localStorage.setItem('hasSeenOnboarding', 'true');
            showScreen('loginScreen');
        };
    }
    
    showSlide(0);
}

// ========== EVENT LISTENERS ==========
function setupEventListeners() {
    // Auth
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const registerSubmit = document.getElementById('registerSubmitBtn');
    const backToLogin = document.getElementById('backToLoginBtn');
    const guestBtn = document.getElementById('guestBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (loginBtn) loginBtn.onclick = login;
    if (registerBtn) registerBtn.onclick = () => showScreen('registerScreen');
    if (registerSubmit) registerSubmit.onclick = registerUser;
    if (backToLogin) backToLogin.onclick = () => showScreen('loginScreen');
    if (guestBtn) guestBtn.onclick = guestLogin;
    if (logoutBtn) logoutBtn.onclick = logout;
    
    // Theme
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) themeToggle.onclick = toggleTheme;
    
    // User dropdown
    const userAvatar = document.getElementById('userAvatar');
    if (userAvatar) userAvatar.onclick = toggleDropdown;
    
    // Report form
    const submitBtn = document.getElementById('submitBtn');
    const takePhoto = document.getElementById('takePhotoBtn');
    const selectPhoto = document.getElementById('selectPhotoBtn');
    const locationCard = document.getElementById('locationCard');
    const refreshLocation = document.getElementById('refreshLocationBtn');
    
    if (submitBtn) submitBtn.onclick = submitIncident;
    if (takePhoto) takePhoto.onclick = takePhoto;
    if (selectPhoto) selectPhoto.onclick = selectPhoto;
    if (locationCard) locationCard.onclick = getLocation;
    if (refreshLocation) refreshLocation.onclick = getLocation;
    
    // Category radio buttons
    document.querySelectorAll('.category-option').forEach(opt => {
        opt.onclick = function() {
            document.querySelectorAll('.category-option').forEach(o => o.classList.remove('selected'));
            this.classList.add('selected');
            const radio = this.querySelector('input');
            if (radio) radio.checked = true;
        };
    });
    
    // Tags input
    const tagsInput = document.getElementById('tagsInput');
    if (tagsInput) {
        tagsInput.onkeypress = function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const tag = this.value.trim();
                if (tag) addTag(tag);
                this.value = '';
            }
        };
    }
    
    // Search
    const searchInput = document.getElementById('searchInput');
    const voiceSearch = document.getElementById('voiceSearchBtn');
    if (searchInput) searchInput.oninput = searchIncidents;
    if (voiceSearch) voiceSearch.onclick = startVoiceSearch;
    
    // Tabs
    document.querySelectorAll('.tab-item').forEach(tab => {
        tab.onclick = () => switchTab(tab.getAttribute('data-tab'));
    });
    
    // Sort buttons
    document.querySelectorAll('.sort-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentSort = btn.getAttribute('data-sort');
            loadIncidents();
        };
    });
    
    // FAB and bottom sheet
    const fabBtn = document.getElementById('fabBtn');
    const sheetOverlay = document.querySelector('.sheet-overlay');
    if (fabBtn) fabBtn.onclick = toggleBottomSheet;
    if (sheetOverlay) sheetOverlay.onclick = toggleBottomSheet;
    
    // Sheet actions
    document.querySelectorAll('.sheet-action').forEach(action => {
        action.onclick = () => {
            toggleBottomSheet();
            const actionType = action.getAttribute('data-action');
            if (actionType === 'report') switchTab('report');
            else if (actionType === 'emergency') triggerEmergencySOS();
            else if (actionType === 'nearby') showNearbyAlerts();
            else if (actionType === 'share') shareApp();
        };
    });
    
    // Map controls
    const zoomBtn = document.getElementById('zoomToUserBtn');
    const heatmapBtn = document.getElementById('heatmapToggleBtn');
    const refreshMapBtn = document.getElementById('refreshMapBtn');
    if (zoomBtn) zoomBtn.onclick = zoomToUser;
    if (heatmapBtn) heatmapBtn.onclick = toggleHeatmap;
    if (refreshMapBtn) refreshMapBtn.onclick = refreshMap;
    
    // Analytics
    const timeframeSelect = document.getElementById('analyticsTimeframe');
    if (timeframeSelect) timeframeSelect.onchange = updateAnalytics;
    
    // Settings
    const notifToggle = document.getElementById('notificationsToggle');
    const privacyToggle = document.getElementById('privacyToggle');
    const offlineToggle = document.getElementById('offlineToggle');
    const changeAvatarBtn = document.getElementById('changeAvatarBtn');
    
    if (notifToggle) notifToggle.onchange = (e) => {
        localStorage.setItem('notificationsEnabled', e.target.checked);
        showToast(`Notifications ${e.target.checked ? 'enabled' : 'disabled'}`, 'info');
    };
    if (privacyToggle) privacyToggle.onchange = (e) => {
        showToast(`Privacy mode ${e.target.checked ? 'on' : 'off'}`, 'info');
    };
    if (offlineToggle) offlineToggle.onchange = (e) => {
        if (e.target.checked) enableOfflineMode();
        else disableOfflineMode();
    };
    if (changeAvatarBtn) changeAvatarBtn.onclick = changeAvatar;
    
    // Emergency SOS
    const confirmSos = document.getElementById('confirmSosBtn');
    const cancelSos = document.getElementById('cancelSosBtn');
    if (confirmSos) confirmSos.onclick = sendEmergencyAlert;
    if (cancelSos) cancelSos.onclick = () => closeModal('emergencyModal');
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        const dropdown = document.getElementById('userDropdown');
        const avatar = document.getElementById('userAvatar');
        if (dropdown && avatar && !avatar.contains(e.target)) {
            dropdown.classList.remove('show');
        }
    });
}

// ========== AUTHENTICATION ==========
function registerUser() {
    const username = document.getElementById('regUsername')?.value.trim();
    const email = document.getElementById('regEmail')?.value.trim();
    const password = document.getElementById('regPassword')?.value;
    const confirm = document.getElementById('regConfirmPassword')?.value;
    
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
    const username = document.getElementById('username')?.value.trim();
    const password = document.getElementById('password')?.value;
    
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
        if (map) updateMapMarkers();
    } else {
        showToast('Invalid username or password', 'error');
    }
}

function guestLogin() {
    currentUser = {
        id: 'guest_' + Date.now(),
        username: 'Guest',
        isGuest: true,
        points: 0
    };
    updateUIForUser();
    showScreen('appScreen');
    loadIncidents();
}

function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    showScreen('loginScreen');
    const usernameField = document.getElementById('username');
    const passwordField = document.getElementById('password');
    if (usernameField) usernameField.value = '';
    if (passwordField) passwordField.value = '';
    showToast('Logged out successfully', 'info');
}

function updateUIForUser() {
    const userNameSpan = document.getElementById('currentUserName');
    const userPointsSpan = document.getElementById('userPoints');
    const profileUsername = document.getElementById('profileUsername');
    const profileJoinDate = document.getElementById('profileJoinDate');
    
    if (userNameSpan) userNameSpan.innerText = currentUser?.username || 'User';
    if (userPointsSpan) userPointsSpan.innerText = currentUser?.points || 0;
    if (profileUsername) profileUsername.innerText = currentUser?.username || 'User';
    if (profileJoinDate && currentUser?.joinDate) {
        profileJoinDate.innerText = `Member since ${new Date(currentUser.joinDate).toLocaleDateString()}`;
    }
}

// ========== DATA MANAGEMENT ==========
function loadAllData() {
    const savedIncidents = localStorage.getItem('incidents');
    if (savedIncidents) {
        allIncidents = JSON.parse(savedIncidents);
    } else {
        loadDemoIncidents();
    }
    
    const savedUsers = localStorage.getItem('users');
    if (savedUsers) {
        allUsers = JSON.parse(savedUsers);
    } else {
        allUsers = [{
            id: 'admin1',
            username: 'Admin',
            email: 'admin@test.com',
            password: 'admin123',
            joinDate: new Date().toISOString(),
            points: 100,
            reports: 5,
            likes: 20,
            achievements: ['first_report']
        }];
        localStorage.setItem('users', JSON.stringify(allUsers));
    }
}

function loadDemoIncidents() {
    allIncidents = [
        {
            id: 1,
            title: 'Multi-Vehicle Accident on Main Highway',
            desc: 'Three cars collided near Exit 45. Multiple injuries reported. Police and ambulance on scene.',
            category: 'Accident',
            severity: 'High',
            lat: 6.5244,
            lng: 3.3792,
            date: new Date().toISOString(),
            reportedBy: 'JohnDoe',
            userId: 'demo1',
            likes: 24,
            comments: 5,
            tags: ['traffic', 'accident']
        },
        {
            id: 2,
            title: 'Large Fight Outside Nightclub',
            desc: 'Group of people fighting. Security trying to intervene.',
            category: 'Fighting',
            severity: 'Medium',
            lat: 6.5225,
            lng: 3.3712,
            date: new Date(Date.now() - 3600000).toISOString(),
            reportedBy: 'JaneSmith',
            userId: 'demo2',
            likes: 12,
            comments: 3,
            tags: ['nightclub', 'fight']
        },
        {
            id: 3,
            title: 'Protest Turns Violent Downtown',
            desc: 'Peaceful protest escalated. Objects being thrown.',
            category: 'Rioting',
            severity: 'Critical',
            lat: 6.5312,
            lng: 3.3856,
            date: new Date(Date.now() - 7200000).toISOString(),
            reportedBy: 'MikeBrown',
            userId: 'demo3',
            likes: 56,
            comments: 12,
            tags: ['protest', 'riot']
        }
    ];
    localStorage.setItem('incidents', JSON.stringify(allIncidents));
}

// ========== INCIDENT DISPLAY ==========
function loadIncidents() {
    const listDiv = document.getElementById('incidentsList');
    if (!listDiv) return;
    
    let filtered = [...allIncidents];
    
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase();
    if (searchTerm) {
        filtered = filtered.filter(i => 
            i.title.toLowerCase().includes(searchTerm) || 
            i.desc.toLowerCase().includes(searchTerm) ||
            (i.tags && i.tags.some(t => t.toLowerCase().includes(searchTerm)))
        );
    }
    
    if (currentSort === 'newest') {
        filtered.sort((a,b) => new Date(b.date) - new Date(a.date));
    } else if (currentSort === 'popular') {
        filtered.sort((a,b) => (b.likes || 0) - (a.likes || 0));
    } else if (currentSort === 'nearby' && userLocation) {
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
        
        html += `
            <div class="incident-card" data-id="${inc.id}">
                <div class="card-header">
                    <span class="category-badge" style="background: ${getCategoryColor(inc.category)}">${inc.category}</span>
                    <span class="severity-badge" style="background: ${getSeverityColor(inc.severity)}">${inc.severity || 'Medium'}</span>
                </div>
                <h3>${escapeHtml(inc.title)}</h3>
                <p>${escapeHtml(inc.desc.substring(0, 120))}${inc.desc.length > 120 ? '...' : ''}</p>
                <div class="card-meta">
                    <span><i class="fas fa-user"></i> ${escapeHtml(inc.reportedBy)}</span>
                    <span><i class="fas fa-clock"></i> ${timeAgo}</span>
                </div>
                <div class="card-tags">
                    ${inc.tags?.map(tag => `<span class="tag-mini">#${escapeHtml(tag)}</span>`).join('') || ''}
                </div>
                <div class="card-actions">
                    <button class="like-btn" data-id="${inc.id}"><i class="fas fa-heart"></i> ${inc.likes || 0}</button>
                    <button class="share-btn" data-id="${inc.id}"><i class="fas fa-share"></i> Share</button>
                    <button class="navigate-btn" data-lat="${inc.lat}" data-lng="${inc.lng}"><i class="fas fa-directions"></i> Navigate</button>
                </div>
            </div>
        `;
    });
    
    listDiv.innerHTML = html;
    
    document.querySelectorAll('.like-btn').forEach(btn => {
        btn.onclick = () => likeIncident(parseInt(btn.dataset.id));
    });
    document.querySelectorAll('.share-btn').forEach(btn => {
        btn.onclick = () => shareIncident(parseInt(btn.dataset.id));
    });
    document.querySelectorAll('.navigate-btn').forEach(btn => {
        btn.onclick = () => navigateToLocation(btn.dataset.lat, btn.dataset.lng);
    });
    
    updateLiveStats();
}

function loadMyIncidents() {
    const myList = document.getElementById('myIncidentsList');
    if (!myList || !currentUser) return;
    
    const myIncidents = allIncidents.filter(i => i.userId === currentUser.id);
    
    const profileReports = document.getElementById('profileReports');
    const profileLikes = document.getElementById('profileLikes');
    const profilePoints = document.getElementById('profilePoints');
    
    if (profileReports) profileReports.innerText = myIncidents.length;
    if (profileLikes) profileLikes.innerText = myIncidents.reduce((sum, i) => sum + (i.likes || 0), 0);
    if (profilePoints) profilePoints.innerText = currentUser.points || 0;
    
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
    const selectedCat = document.querySelector('input[name="category"]:checked');
    const category = selectedCat?.value;
    const title = document.getElementById('incidentTitle')?.value.trim();
    const desc = document.getElementById('incidentDesc')?.value.trim();
    const severitySlider = document.getElementById('severitySlider');
    const severity = severitySlider ? severitySlider.value : '2';
    const lat = document.getElementById('lat')?.value;
    const lng = document.getElementById('lng')?.value;
    const mediaData = document.getElementById('mediaData')?.value;
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
        severity: severityMap[severity] || 'Medium',
        lat: parseFloat(lat) || 6.5244,
        lng: parseFloat(lng) || 3.3792,
        date: new Date().toISOString(),
        reportedBy: currentUser?.username || 'Anonymous',
        userId: currentUser?.id || 'guest',
        media: mediaData || null,
        likes: 0,
        comments: 0,
        tags: tags
    };
    
    allIncidents.unshift(newIncident);
    localStorage.setItem('incidents', JSON.stringify(allIncidents));
    
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
    
    sendPushNotification(`New ${category} incident reported nearby!`);
    showToast('âœ… Incident reported! +10 points!', 'success');
    
    // Reset form
    const reportForm = document.getElementById('reportForm');
    if (reportForm) reportForm.reset();
    const mediaPreview = document.getElementById('mediaPreview');
    if (mediaPreview) mediaPreview.innerHTML = '';
    const tagsContainer = document.getElementById('tagsContainer');
    if (tagsContainer) tagsContainer.innerHTML = '';
    const locationPreview = document.getElementById('locationPreview');
    if (locationPreview) locationPreview.innerHTML = '';
    
    document.querySelectorAll('.category-option').forEach(o => o.classList.remove('selected'));
    
    loadIncidents();
    if (map) updateMapMarkers();
    updateAnalytics();
    
    if (currentUser && !currentUser.isGuest) loadMyIncidents();
    
    switchTab('feed');
}

// ========== MAP FEATURES ==========
function initMap() {
    if (typeof L === 'undefined') return;
    
    map = L.map('incidentMap').setView([6.5244, 3.3792], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: 'Â© OpenStreetMap contributors'
    }).addTo(map);
    
    updateMapMarkers();
}

function updateMapMarkers() {
    if (!map || typeof L === 'undefined') return;
    
    mapMarkers.forEach(marker => map.removeLayer(marker));
    mapMarkers = [];
    
    allIncidents.forEach(incident => {
        const color = getCategoryColor(incident.category);
        const marker = L.circleMarker([incident.lat, incident.lng], {
            radius: 8,
            fillColor: color,
            color: '#fff',
            weight: 2,
            fillOpacity: 0.8
        }).addTo(map);
        
        marker.bindPopup(`
            <b>${escapeHtml(incident.title)}</b><br>
            ${incident.category}<br>
            ${new Date(incident.date).toLocaleString()}
        `);
        
        mapMarkers.push(marker);
    });
}

function zoomToUser() {
    if (userLocation && map) {
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
    if (!statusSpan) return;
    
    statusSpan.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Getting location...';
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                const latField = document.getElementById('lat');
                const lngField = document.getElementById('lng');
                if (latField) latField.value = userLocation.lat;
                if (lngField) lngField.value = userLocation.lng;
                statusSpan.innerHTML = '<i class="fas fa-check-circle"></i> Location captured!';
                
                // Simple location preview
                const locationPreview = document.getElementById('locationPreview');
                if (locationPreview) {
                    locationPreview.innerHTML = `<i class="fas fa-location-dot"></i> Lat: ${userLocation.lat.toFixed(4)}, Lng: ${userLocation.lng.toFixed(4)}`;
                }
            },
            error => {
                statusSpan.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Using default location';
                if (latField) latField.value = '6.5244';
                if (lngField) lngField.value = '3.3792';
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
                const mediaData = document.getElementById('mediaData');
                const mediaType = document.getElementById('mediaType');
                const mediaPreview = document.getElementById('mediaPreview');
                if (mediaData) mediaData.value = imageData;
                if (mediaType) mediaType.value = 'photo';
                if (mediaPreview) {
                    mediaPreview.innerHTML = `<img src="data:image/jpeg;base64,${imageData}"><button class="remove-media" onclick="this.parentElement.innerHTML=''"><i class="fas fa-times"></i></button>`;
                }
                showToast('Photo captured!', 'success');
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
                const mediaData = document.getElementById('mediaData');
                const mediaType = document.getElementById('mediaType');
                const mediaPreview = document.getElementById('mediaPreview');
                if (mediaData) mediaData.value = imageData;
                if (mediaType) mediaType.value = 'photo';
                if (mediaPreview) {
                    mediaPreview.innerHTML = `<img src="data:image/jpeg;base64,${imageData}"><button class="remove-media" onclick="this.parentElement.innerHTML=''"><i class="fas fa-times"></i></button>`;
                }
                showToast('Photo selected!', 'success');
            },
            err => showToast('Gallery error', 'error'),
            {
                quality: 80,
                destinationType: Camera.DestinationType.DATA_URL,
                sourceType: Camera.PictureSourceType.PHOTOLIBRARY
            }
        );
    } else {
        showToast('Gallery will work in installed app', 'info');
    }
}

// ========== TAGS SYSTEM ==========
function addTag(tag) {
    const tagsContainer = document.getElementById('tagsContainer');
    if (!tagsContainer) return;
    
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
    } else if (incident) {
        navigator.clipboard.writeText(`Check out: ${incident.title} - https://maps.google.com/?q=${incident.lat},${incident.lng}`);
        showToast('Link copied to clipboard!', 'success');
    }
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
    
    const categoryCount = {};
    filtered.forEach(i => {
        categoryCount[i.category] = (categoryCount[i.category] || 0) + 1;
    });
    
    // Simple chart display
    const chartDiv = document.getElementById('categoryChart');
    if (chartDiv && Object.keys(categoryCount).length > 0) {
        let chartHtml = '<h4>Incidents by Category</h4>';
        for (const [cat, count] of Object.entries(categoryCount)) {
            const percent = Math.round((count / filtered.length) * 100);
            chartHtml += `
                <div style="margin: 8px 0;">
                    <span style="display: inline-block; width: 100px;">${cat}</span>
                    <div style="display: inline-block; width: 150px; background: #333; border-radius: 10px; overflow: hidden;">
                        <div style="width: ${percent}%; background: #e94560; height: 20px;"></div>
                    </div>
                    <span style="margin-left: 10px;">${count} (${percent}%)</span>
                </div>
            `;
        }
        chartDiv.innerHTML = chartHtml;
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
    
    const leaderboardList = document.getElementById('leaderboardList');
    if (leaderboardList) leaderboardList.innerHTML = leaderboardHtml || '<div>No data yet</div>';
    
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
    
    const hotspotsList = document.getElementById('hotspotsList');
    if (hotspotsList) hotspotsList.innerHTML = hotspotsHtml || '<div>No recent hotspots</div>';
}

// ========== ACHIEVEMENTS ==========
const achievementsList = [
    { id: 'first_report', name: 'First Responder', icon: 'ðŸŽ–ï¸', requirement: 'Submit first report' },
    { id: '10_reports', name: 'Community Watch', icon: 'ðŸ‘ï¸', requirement: 'Submit 10 reports' },
    { id: '50_reports', name: 'Guardian Angel', icon: 'ðŸ‘¼', requirement: 'Submit 50 reports' },
    { id: '100_likes', name: 'Influencer', icon: 'â­', requirement: 'Receive 100 likes' }
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
    
    const achievementsDiv = document.getElementById('achievementsList');
    if (achievementsDiv) achievementsDiv.innerHTML = html;
}

function checkAchievements() {
    if (!currentUser || currentUser.isGuest) return;
    
    const unlocked = currentUser.achievements || [];
    const reports = currentUser.reports || 0;
    
    if (reports >= 1 && !unlocked.includes('first_report')) {
        unlockAchievement('first_report');
    }
    if (reports >= 10 && !unlocked.includes('10_reports')) {
        unlockAchievement('10_reports');
    }
    if (reports >= 50 && !unlocked.includes('50_reports')) {
        unlockAchievement('50_reports');
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
    }
}

// ========== VOICE SEARCH ==========
function startVoiceSearch() {
    if ('webkitSpeechRecognition' in window) {
        const recognition = new webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'en-US';
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            const searchInput = document.getElementById('searchInput');
            if (searchInput) searchInput.value = transcript;
            searchIncidents();
        };
        recognition.start();
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
        if (timerDiv) timerDiv.innerText = countdown;
        if (countdown === 0) {
            clearInterval(interval);
            sendEmergencyAlert();
        }
    }, 1000);
}

function sendEmergencyAlert() {
    closeModal('emergencyModal');
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            showToast('ðŸš¨ Emergency alert sent to authorities!', 'error');
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
}

function showNearbyAlerts() {
    if (userLocation) {
        const nearby = allIncidents.filter(i => {
            const dist = getDistance(userLocation.lat, userLocation.lng, i.lat, i.lng);
            return dist < 1;
        });
        showToast(`${nearby.length} incidents within 1km of you`, 'info');
    } else {
        getLocation();
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

// ========== UI HELPERS ==========
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(screenId);
    if (target) {
        target.classList.add('active');
        if (screenId === 'appScreen') {
            loadIncidents();
            updateAnalytics();
            if (map) updateMapMarkers();
        }
    }
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
    const activeTab = document.querySelector(`.tab-item[data-tab="${tabId}"]`);
    if (activeTab) activeTab.classList.add('active');
    
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    const targetTab = document.getElementById(tabId + 'Tab');
    if (targetTab) {
        targetTab.classList.add('active');
        
        if (tabId === 'feed') loadIncidents();
        if (tabId === 'map' && !map) initMap();
        if (tabId === 'map' && map) updateMapMarkers();
        if (tabId === 'analytics') updateAnalytics();
        if (tabId === 'profile') {
            updateAchievements();
            loadMyIncidents();
        }
        if (tabId === 'report') getLocation();
    }
    
    const sheet = document.getElementById('bottomSheet');
    if (sheet) sheet.classList.remove('open');
}

function toggleTheme() {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.innerHTML = isLight ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    }
}

function toggleDropdown() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) dropdown.classList.toggle('show');
}

function toggleBottomSheet() {
    const sheet = document.getElementById('bottomSheet');
    if (sheet) sheet.classList.toggle('open');
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('open');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('open');
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) {
        alert(message);
        return;
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';
    toast.innerHTML = `<i class="fas ${icon}"></i><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
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
                const profileAvatar = document.getElementById('profileAvatar');
                if (profileAvatar) {
                    profileAvatar.innerHTML = `<img src="data:image/jpeg;base64,${imageData}" class="avatar-img"><button id="changeAvatarBtn" class="avatar-edit"><i class="fas fa-camera"></i></button>`;
                    localStorage.setItem('userAvatar', imageData);
                }
                showToast('Profile picture updated!', 'success');
            },
            err => showToast('Error', 'error'),
            { quality: 80, destinationType: Camera.DestinationType.DATA_URL, sourceType: Camera.PictureSourceType.PHOTOLIBRARY }
        );
    }
}

function searchIncidents() {
    loadIncidents();
}

function updateLiveStats() {
    const liveIncidents = document.getElementById('liveIncidents');
    const liveUsers = document.getElementById('liveUsers');
    const userPoints = document.getElementById('userPoints');
    
    if (liveIncidents) liveIncidents.innerText = allIncidents.length;
    if (liveUsers) liveUsers.innerText = Math.floor(Math.random() * 50) + 10;
    if (userPoints) userPoints.innerText = currentUser?.points || 0;
}

function startLiveUpdates() {
    setInterval(() => {
        if (document.getElementById('feedTab')?.classList.contains('active')) {
            loadIncidents();
        }
        if (document.getElementById('analyticsTab')?.classList.contains('active')) {
            updateAnalytics();
        }
    }, 30000);
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
        if (map) updateMapMarkers();
    }
}

// Make functions global for HTML onclick
window.navigateToLocation = navigateToLocation;
window.addTag = addTag;
