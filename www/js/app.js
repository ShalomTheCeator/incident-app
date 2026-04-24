var allIncidents = [];
var currentUser = null;

document.addEventListener('deviceready', onDeviceReady, false);

function onDeviceReady() {
    loadDemoData();
    setupEventListeners();
    checkLogin();
}

function setupEventListeners() {
    document.getElementById('loginBtn').onclick = login;
    document.getElementById('guestBtn').onclick = guestLogin;
    document.getElementById('submitBtn').onclick = submitIncident;
    document.getElementById('takePhotoBtn').onclick = takePhoto;
    document.getElementById('selectPhotoBtn').onclick = selectPhoto;
    document.getElementById('locationBox').onclick = getLocation;
    document.getElementById('searchInput').oninput = searchIncidents;
    
    document.querySelectorAll('.tab').forEach(tab => {
        tab.onclick = () => switchTab(tab.getAttribute('data-tab'));
    });
}

function login() {
    let username = document.getElementById('username').value.trim();
    if(!username) return showStatus('Enter username','error');
    currentUser = {username: username, userId: 'user_'+Date.now()};
    localStorage.setItem('user',JSON.stringify(currentUser));
    showStatus('Login success!','success');
    setTimeout(()=>{showScreen('appScreen'); loadIncidents(); loadMyIncidents();},1000);
}

function guestLogin() {
    currentUser = {username:'Guest', userId:'guest_'+Date.now()};
    localStorage.setItem('user',JSON.stringify(currentUser));
    showScreen('appScreen');
    loadIncidents();
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function switchTab(tabId) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.tab[data-tab="${tabId}"]`).classList.add('active');
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(tabId+'Tab').classList.add('active');
    if(tabId==='myincidents') loadMyIncidents();
    if(tabId==='incidents') loadIncidents();
    if(tabId==='report') getLocation();
}

function loadDemoData() {
    let saved = localStorage.getItem('incidents');
    if(saved) allIncidents = JSON.parse(saved);
    else {
        allIncidents = [
            {id:1, title:'Accident on Main St', desc:'Two cars collided', category:'Accident', lat:'6.5244', lng:'3.3792', date:new Date().toISOString(), reportedBy:'Demo', userId:'demo'},
            {id:2, title:'Fighting at Mall', desc:'Group fight', category:'Fighting', lat:'6.5225', lng:'3.3712', date:new Date().toISOString(), reportedBy:'Demo2', userId:'demo2'}
        ];
        localStorage.setItem('incidents',JSON.stringify(allIncidents));
    }
}

function loadIncidents() {
    let listDiv = document.getElementById('incidentsList');
    if(allIncidents.length===0) {listDiv.innerHTML='<p>No incidents</p>'; return;}
    let html = '';
    [...allIncidents].reverse().forEach(inc => {
        html += `<div class="incident-card" data-cat="${inc.category}">
            <div class="category ${inc.category}">${inc.category}</div>
            <h3>${inc.title}</h3>
            <p>${inc.desc}</p>
            <small>👤 ${inc.reportedBy} | 🕒 ${new Date(inc.date).toLocaleString()}</small><br>
            <a href="https://maps.google.com/?q=${inc.lat},${inc.lng}" target="_blank">📍 View Map</a>
        </div>`;
    });
    listDiv.innerHTML = html;
    setupFilters();
}

function loadMyIncidents() {
    let myList = document.getElementById('myIncidentsList');
    let myInc = allIncidents.filter(i=>i.userId===currentUser?.userId);
    if(myInc.length===0) {myList.innerHTML='<p>No reports yet</p>'; return;}
    let html = '';
    myInc.forEach(inc=>{
        html += `<div class="incident-card">
            <div class="category ${inc.category}">${inc.category}</div>
            <h3>${inc.title}</h3>
            <p>${inc.desc}</p>
            <small>🕒 ${new Date(inc.date).toLocaleString()}</small>
        </div>`;
    });
    myList.innerHTML = html;
}

function submitIncident() {
    let cat = document.getElementById('incidentCategory').value;
    let desc = document.getElementById('incidentDesc').value;
    let lat = document.getElementById('lat').value;
    let lng = document.getElementById('lng').value;
    let photo = document.getElementById('photoData').value;
    if(!cat || !desc) return showStatus('Fill all fields','error');
    let newInc = {
        id: Date.now(),
        title: cat+' Incident',
        desc: desc,
        category: cat,
        lat: lat||'6.5244',
        lng: lng||'3.3792',
        date: new Date().toISOString(),
        reportedBy: currentUser?.username||'Anonymous',
        userId: currentUser?.userId||'guest',
        photo: photo
    };
    allIncidents.unshift(newInc);
    localStorage.setItem('incidents',JSON.stringify(allIncidents));
    document.getElementById('reportForm')?.reset();
    document.getElementById('photoPreview').innerHTML='';
    if(navigator.notification) navigator.notification.alert('Incident reported!');
    else alert('Incident reported!');
    showStatus('Reported!','success');
    loadIncidents();
    switchTab('incidents');
}

function getLocation() {
    let statusSpan = document.getElementById('locationStatus');
    statusSpan.innerText = 'Getting location...';
    if(navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            pos => {
                document.getElementById('lat').value = pos.coords.latitude;
                document.getElementById('lng').value = pos.coords.longitude;
                statusSpan.innerHTML = '✓ Location captured';
            },
            err => {
                statusSpan.innerHTML = '⚠ Using default';
                document.getElementById('lat').value = '6.5244';
                document.getElementById('lng').value = '3.3792';
            }
        );
    } else {
        statusSpan.innerHTML = '⚠ Not supported';
    }
}

function takePhoto() {
    if(navigator.camera) {
        navigator.camera.getPicture(img => {
            document.getElementById('photoData').value = img;
            document.getElementById('photoPreview').innerHTML = `<img src="data:image/jpeg;base64,${img}" style="max-width:100%">`;
        }, err=>showStatus('Camera error','error'), {quality:70, destinationType:Camera.DestinationType.DATA_URL, sourceType:Camera.PictureSourceType.CAMERA});
    } else showStatus('Camera ready in app','info');
}

function selectPhoto() {
    if(navigator.camera) {
        navigator.camera.getPicture(img => {
            document.getElementById('photoData').value = img;
            document.getElementById('photoPreview').innerHTML = `<img src="data:image/jpeg;base64,${img}" style="max-width:100%">`;
        }, err=>showStatus('Gallery error','error'), {quality:70, destinationType:Camera.DestinationType.DATA_URL, sourceType:Camera.PictureSourceType.PHOTOLIBRARY});
    } else showStatus('Gallery ready in app','info');
}

function searchIncidents() {
    let term = document.getElementById('searchInput').value.toLowerCase();
    let cards = document.querySelectorAll('#incidentsList .incident-card');
    cards.forEach(card => {
        let text = card.innerText.toLowerCase();
        card.style.display = text.includes(term) ? 'block' : 'none';
    });
}

function setupFilters() {
    let cats = [...new Set(allIncidents.map(i=>i.category))];
    let filterDiv = document.getElementById('categoryFilters');
    filterDiv.innerHTML = '<span class="filter-chip active" data-cat="all">All</span>';
    cats.forEach(c => {
        filterDiv.innerHTML += `<span class="filter-chip" data-cat="${c}">${c}</span>`;
    });
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.onclick = () => {
            document.querySelectorAll('.filter-chip').forEach(c=>c.classList.remove('active'));
            chip.classList.add('active');
            let cat = chip.getAttribute('data-cat');
            document.querySelectorAll('#incidentsList .incident-card').forEach(card => {
                if(cat==='all' || card.getAttribute('data-cat')===cat) card.style.display = 'block';
                else card.style.display = 'none';
            });
        };
    });
}

function showStatus(msg, type) {
    let div = document.getElementById('loginStatus');
    if(div) {div.innerText=msg; div.className='status-message '+type; setTimeout(()=>div.innerText='',3000);}
    else alert(msg);
}

function checkLogin() {
    let saved = localStorage.getItem('user');
    if(saved) {currentUser=JSON.parse(saved); showScreen('appScreen'); loadIncidents();}
}
