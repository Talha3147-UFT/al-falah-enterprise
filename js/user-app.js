/* =============================================
   Al-Falah Enterprise - User App.js
   Admin User Dashboard & Functions
   ============================================= */

import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword, signOut, updatePassword, updateEmail, updateProfile, EmailAuthProvider, reauthenticateWithCredential, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, setDoc, getDoc, query, where, orderBy, limit } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

// Helpers
function FC(a) { return '৳' + parseFloat(a || 0).toLocaleString('en-BD', {minimumFractionDigits:2}); }
function TD() { return new Date().toISOString().split('T')[0]; }
function CP() { const p = window.location.pathname; return p.substring(p.lastIndexOf('/')+1) || 'user-dashboard.html'; }
function UID() { const s = localStorage.getItem('alfalah_user') || sessionStorage.getItem('alfalah_user'); if(s){try{return JSON.parse(s).uid}catch(e){}} return auth.currentUser?.uid; }
function getUserData() { const s = localStorage.getItem('alfalah_user') || sessionStorage.getItem('alfalah_user'); if(s){try{return JSON.parse(s)}catch(e){}} return null; }

const page = CP();
const pub = ['index.html','login.html','setup.html',''];

// Session check for login page
if(page === 'login.html') {
    const stored = localStorage.getItem('alfalah_user') || sessionStorage.getItem('alfalah_user');
    if(stored) {
        try {
            const data = JSON.parse(stored);
            if(data.loginTime && (Date.now() - data.loginTime) < 86400000) {
                if(data.role === 'main_admin') {
                    window.location.href = 'dashboard.html';
                } else {
                    window.location.href = 'user-dashboard.html';
                }
            }
        } catch(e) {}
    }
}

// Protect pages
if(!pub.includes(page) && !UID()) {
    window.location.href = 'login.html';
}

onAuthStateChanged(auth, u => { 
    if(u) {
        const stored = getUserData();
        if(!stored) {
            localStorage.setItem('alfalah_user', JSON.stringify({uid:u.uid, email:u.email, username:'User', role:'admin', loginTime:Date.now()}));
        }
    }
});

// Print
window.printTable = function(tableId, title, date) {
    const table = document.getElementById(tableId);
    if(!table) return;
    const w = window.open('', '_blank', 'width=1000,height=700');
    const clone = table.cloneNode(true);
    clone.querySelectorAll('button, i, input[type="checkbox"], .no-print').forEach(el => el.remove());
    w.document.write('<!DOCTYPE html><html><head><title>'+title+'</title><style>body{font-family:Arial;padding:30px}table{width:100%;border-collapse:collapse}th{background:#059669;color:white;padding:10px}td{padding:8px;border-bottom:1px solid #ddd}h2{color:#059669}@media print{body{padding:10px}}</style></head><body><h2>Al-Falah Enterprise</h2><h3>'+title+'</h3><p>Date: '+(date||TD())+'</p>'+clone.outerHTML+'<script>setTimeout(()=>window.print(),500)<\/script></body></html>');
    w.document.close();
};

window.exportCSV = function(tableId, filename) {
    const table = document.getElementById(tableId);
    if(!table) return;
    const rows = table.querySelectorAll('tr');
    let csv = [];
    rows.forEach(row => {
        const cols = row.querySelectorAll('th, td');
        const rowData = [];
        for(let i=1; i<cols.length-1; i++) rowData.push('"'+cols[i].textContent.trim().replace(/"/g,'""')+'"');
        if(rowData.length>0) csv.push(rowData.join(','));
    });
    const blob = new Blob(['\uFEFF'+csv.join('\n')], {type:'text/csv;charset=utf-8;'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = (filename||'export')+'_'+TD()+'.csv';
    link.click();
    Swal.fire({icon:'success',title:'Exported!',timer:1500,showConfirmButton:false});
};

// Logout
window.logout = async function() {
    const r = await Swal.fire({title:'Logout?',icon:'question',showCancelButton:true,confirmButtonColor:'#059669',cancelButtonColor:'#d33',confirmButtonText:'Yes'});
    if(r.isConfirmed) {
        localStorage.removeItem('alfalah_user');
        sessionStorage.removeItem('alfalah_user');
        await signOut(auth);
        window.location.href = 'login.html';
    }
};

// Delete
window.deleteItem = async function(col,id) {
    const r = await Swal.fire({title:'Delete?',text:'Cannot be undone!',icon:'warning',showCancelButton:true,confirmButtonColor:'#d33',confirmButtonText:'Delete'});
    if(r.isConfirmed){await deleteDoc(doc(db,col,id));Swal.fire({icon:'success',title:'Deleted!',timer:1000,showConfirmButton:false});setTimeout(()=>location.reload(),500);}
};

// ============ USER DASHBOARD ============
if(page === 'user-dashboard.html') {
    const userData = getUserData();
    document.getElementById('welcomeMessage').textContent = 'Welcome back, ' + (userData?.username || 'Admin User') + '!';
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString('en-US', {weekday:'long', year:'numeric', month:'long', day:'numeric'});

    async function loadDashboard() {
        const uid = UID();
        if(!uid) return;
        const today = TD();

        try {
            const [sS, eS] = await Promise.all([
                getDocs(query(collection(db,'sales'), where('userId','==',uid))),
                getDocs(query(collection(db,'expenses'), where('userId','==',uid)))
            ]);

            const ts = sS.docs.filter(d=>d.data().date===today).reduce((s,d)=>s+(d.data().totalRevenue||d.data().sellingPrice||0),0);
            const tp = sS.docs.filter(d=>d.data().date===today).reduce((s,d)=>s+(d.data().totalCost||((d.data().purchasePricePerUnit||0)*(d.data().quantitySold||0))),0);
            const te = eS.docs.filter(d=>d.data().date===today).reduce((s,d)=>s+(d.data().cost||0),0);

            document.getElementById('todaySales').textContent = FC(ts);
            document.getElementById('todayPurchases').textContent = FC(tp);
            document.getElementById('todayExpenses').textContent = FC(te);
            document.getElementById('netBalance').textContent = FC(ts - tp - te);

            const rDocs = sS.docs.filter(d=>d.data().date===today).sort((a,b)=>new Date(b.data().createdAt||0)-new Date(a.data().createdAt||0)).slice(0,5);
            const ad = document.getElementById('recentActivity');
            if(rDocs.length===0) {
                ad.innerHTML = '<p class="text-gray-500 text-center py-4">No sales today</p>';
            } else {
                ad.innerHTML = rDocs.map(d=>{
                    const dt=d.data();
                    return '<div class="flex justify-between p-3 bg-gray-50 rounded-lg mb-2"><div><p class="font-semibold text-sm">'+dt.productName+'</p><p class="text-xs text-gray-500">Qty:'+dt.quantitySold+' | '+dt.customerName+'</p></div><span class="text-emerald-600 font-semibold text-sm">'+FC(dt.totalRevenue||dt.sellingPrice||0)+'</span></div>';
                }).join('');
            }
        } catch(e) { console.error(e); }
    }

    loadDashboard();
}

// ============ USER REPORTS ============
if(page === 'user-reports.html') {
    document.getElementById('reportDate').value = TD();

    async function loadMyReports() {
        const uid = UID();
        if(!uid) return;

        const tbody = document.getElementById('myReportsBody');
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8">Loading...</td></tr>';

        try {
            const q = query(collection(db,'user_reports'), where('userId','==',uid), orderBy('createdAt','desc'), limit(50));
            const snap = await getDocs(q);
            tbody.innerHTML = '';

            const countEl = document.getElementById('reportCount');
            if(countEl) countEl.textContent = snap.size + ' reports';

            if(snap.empty) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-gray-500">No reports submitted yet</td></tr>';
                return;
            }

            snap.forEach(d => {
                const data = d.data();
                let statusBadge = '';
                if(data.status === 'reviewed') statusBadge = '<span class="badge badge-success">✅ Reviewed</span>';
                else if(data.status === 'seen') statusBadge = '<span class="badge badge-info">👁️ Seen</span>';
                else statusBadge = '<span class="badge badge-warning">⏳ Pending</span>';

                const row = document.createElement('tr');
                row.className = 'border-b hover:bg-gray-50';
                row.innerHTML = `
                    <td class="p-3 text-sm">${data.date||'-'}</td>
                    <td class="p-3 font-medium">${data.title||'-'}</td>
                    <td class="p-3 text-sm">${data.type||'-'}</td>
                    <td class="p-3">${statusBadge}</td>
                    <td class="p-3 text-center">
                        <button onclick="viewReport('${d.id}')" class="text-blue-600 hover:text-blue-800 mr-2"><i class="fas fa-eye"></i></button>
                        <button onclick="deleteMyReport('${d.id}')" class="text-red-600 hover:text-red-800"><i class="fas fa-trash"></i></button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        } catch(e) { tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-red-500">Error</td></tr>'; }
    }

    document.getElementById('reportForm')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        const uid = UID();
        const userData = getUserData();

        const msg = document.getElementById('reportMsg');
        msg.classList.remove('hidden');
        msg.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Submitting...';
        msg.className = 'mt-4 p-4 rounded-lg text-center bg-blue-50 text-blue-700';

        try {
            await addDoc(collection(db,'user_reports'), {
                title: document.getElementById('reportTitle').value.trim(),
                type: document.getElementById('reportType').value,
                content: document.getElementById('reportContent').value.trim(),
                date: document.getElementById('reportDate').value || TD(),
                submittedBy: userData?.username || 'Admin User',
                submittedByEmail: userData?.email || '',
                userId: uid,
                status: 'pending',
                createdAt: new Date().toISOString()
            });

            msg.innerHTML = '✅ Report submitted successfully!';
            msg.className = 'mt-4 p-4 rounded-lg text-center bg-green-50 text-green-700';
            document.getElementById('reportForm').reset();
            document.getElementById('reportDate').value = TD();
            loadMyReports();
            Swal.fire({icon:'success',title:'Submitted!',text:'Report sent to Main Admin.',confirmButtonColor:'#059669'});
        } catch(err) {
            msg.innerHTML = '❌ ' + err.message;
            msg.className = 'mt-4 p-4 rounded-lg text-center bg-red-50 text-red-700';
        }
    });

    window.viewReport = async function(id) {
        const snap = await getDoc(doc(db,'user_reports',id));
        if(snap.exists()) {
            const data = snap.data();
            Swal.fire({
                title: data.title,
                html: `<div class="text-left space-y-2"><p><b>Type:</b> ${data.type}</p><p><b>Date:</b> ${data.date}</p><p><b>Status:</b> ${data.status}</p><hr><p><b>Content:</b></p><div class="bg-gray-50 p-3 rounded text-sm max-h-60 overflow-y-auto">${data.content.replace(/\n/g,'<br>')}</div></div>`,
                confirmButtonColor: '#059669'
            });
        }
    };

    window.deleteMyReport = async function(id) {
        const r = await Swal.fire({title:'Delete?',icon:'warning',showCancelButton:true,confirmButtonColor:'#d33'});
        if(r.isConfirmed) { await deleteDoc(doc(db,'user_reports',id)); Swal.fire({icon:'success',title:'Deleted!',timer:1500}); loadMyReports(); }
    };

    loadMyReports();
}

// ============ PURCHASES ============
if(page === 'purchases.html') {
    document.getElementById('purchaseDate').value = TD();
    document.getElementById('quantity')?.addEventListener('input',function(){document.getElementById('stockRemaining').value=this.value;});

    async function load() {
        const uid = UID(); if(!uid) return;
        const snap = await getDocs(query(collection(db,'purchases'),where('userId','==',uid)));
        const tb = document.getElementById('purchasesTableBody'); tb.innerHTML = '';
        if(snap.empty){tb.innerHTML='<tr><td colspan="8" class="text-center py-8 text-gray-500">No purchases</td></tr>';return;}
        snap.docs.sort((a,b)=>new Date(b.data().createdAt||0)-new Date(a.data().createdAt||0)).forEach(d=>{
            const dt=d.data();
            tb.innerHTML+='<tr class="border-b"><td class="p-3"><input type="checkbox" value="'+d.id+'"></td><td class="p-3">'+dt.foundationName+'</td><td class="p-3">'+dt.productName+'</td><td class="p-3">'+dt.date+'</td><td class="p-3">'+FC(dt.price)+'</td><td class="p-3">'+dt.quantity+'</td><td class="p-3">'+dt.stockRemaining+'</td><td class="p-3 no-print"><button class="text-blue-600 mr-2" onclick="editPurchase(\''+d.id+'\')"><i class="fas fa-edit"></i></button><button class="text-red-600" onclick="deleteItem(\'purchases\',\''+d.id+'\')"><i class="fas fa-trash"></i></button></td></tr>';
        });
    }

    document.getElementById('purchaseForm')?.addEventListener('submit',async function(e){
        e.preventDefault();const uid=UID();
        await addDoc(collection(db,'purchases'),{foundationName:document.getElementById('foundationName').value,productName:document.getElementById('productName').value,date:document.getElementById('purchaseDate').value,price:parseFloat(document.getElementById('price').value)||0,quantity:parseInt(document.getElementById('quantity').value)||0,stockRemaining:parseInt(document.getElementById('stockRemaining').value)||parseInt(document.getElementById('quantity').value)||0,userId:uid,createdAt:new Date().toISOString()});
        Swal.fire({icon:'success',title:'Added!',timer:1000,showConfirmButton:false});
        document.getElementById('purchaseForm').reset();document.getElementById('purchaseDate').value=TD();document.getElementById('purchaseModal').classList.remove('active');load();
    });

    window.openAddModal=function(){document.getElementById('modalTitle').textContent='Add New Purchase';document.getElementById('purchaseForm').reset();document.getElementById('purchaseId').value='';document.getElementById('purchaseDate').value=TD();document.getElementById('purchaseModal').classList.add('active');};
    window.closeModal=function(){document.getElementById('purchaseModal').classList.remove('active');};
    window.editPurchase=async function(id){const s=await getDoc(doc(db,'purchases',id));if(s.exists()){const d=s.data();document.getElementById('modalTitle').textContent='Edit Purchase';document.getElementById('purchaseId').value=id;document.getElementById('foundationName').value=d.foundationName;document.getElementById('productName').value=d.productName;document.getElementById('purchaseDate').value=d.date;document.getElementById('price').value=d.price;document.getElementById('quantity').value=d.quantity;document.getElementById('stockRemaining').value=d.stockRemaining;document.getElementById('purchaseModal').classList.add('active');}};
    window.printPurchases = function(){ printTable('purchasesTable', 'Purchase Report', TD()); };
    window.exportPurchasesCSV = function(){ exportCSV('purchasesTable', 'purchases'); };
    load();
}

// ============ SALES ============
if(page === 'sales.html') {
    async function loadProducts(){const uid=UID();if(!uid)return;const snap=await getDocs(query(collection(db,'purchases'),where('userId','==',uid)));const sel=document.getElementById('productSelect');sel.innerHTML='<option value="">-- Choose a product --</option>';snap.forEach(d=>{const dt=d.data();if(dt.stockRemaining>0){const o=document.createElement('option');o.value=d.id;o.textContent=dt.productName+' - Stock:'+dt.stockRemaining+' | Buy:৳'+dt.price+'/pc';o.dataset.stock=dt.stockRemaining;o.dataset.price=dt.price;o.dataset.name=dt.productName;sel.appendChild(o);}});}
    
    window.onProductSelect=function(){const sel=document.getElementById('productSelect'),det=document.getElementById('productDetails');if(!sel.value){det.classList.add('hidden');return;}const o=sel.options[sel.selectedIndex];document.getElementById('stockAvailable').textContent=o.dataset.stock;document.getElementById('purchasePrice').textContent=FC(parseFloat(o.dataset.price));document.getElementById('sellQuantity').max=o.dataset.stock;document.getElementById('sellQuantity').value='';document.getElementById('sellingPrice').value='';document.getElementById('maxQuantity').textContent='Max: '+o.dataset.stock+' units';det.classList.remove('hidden');document.getElementById('profitLossDisplay').classList.add('hidden');};
    
    function calcPL(){const sel=document.getElementById('productSelect');if(!sel||!sel.value)return;const o=sel.options[sel.selectedIndex];const bp=parseFloat(o.dataset.price)||0,qty=parseInt(document.getElementById('sellQuantity').value)||0,sp=parseFloat(document.getElementById('sellingPrice').value)||0;const disp=document.getElementById('profitLossDisplay');if(qty<=0||sp<=0){disp.classList.add('hidden');return;}const tc=bp*qty,tr=sp*qty,pl=tr-tc;disp.classList.remove('hidden');disp.className=pl>=0?'bg-green-50 p-4 rounded-lg border-2 border-green-300':'bg-red-50 p-4 rounded-lg border-2 border-red-300';disp.innerHTML='<div class="space-y-1 text-sm"><div class="flex justify-between"><span>Buy: '+FC(bp)+' × '+qty+'</span><span>= '+FC(tc)+'</span></div><div class="flex justify-between"><span>Sell: '+FC(sp)+' × '+qty+'</span><span>= '+FC(tr)+'</span></div><hr><div class="flex justify-between items-center"><span class="font-bold '+(pl>=0?'text-green-700':'text-red-700')+'">'+(pl>=0?'📈 PROFIT':'📉 LOSS')+'</span><span class="text-xl font-bold '+(pl>=0?'text-green-600':'text-red-600')+'">'+FC(Math.abs(pl))+'</span></div></div>';}
    
    document.getElementById('sellQuantity')?.addEventListener('input',calcPL);
    document.getElementById('sellingPrice')?.addEventListener('input',calcPL);

    document.getElementById('salesForm')?.addEventListener('submit',async function(e){
        e.preventDefault();const uid=UID();if(!uid){Swal.fire({icon:'error',title:'Error',text:'Login again!'});return;}
        const sel=document.getElementById('productSelect');if(!sel.value){Swal.fire({icon:'warning',title:'Error',text:'Select product!'});return;}
        const o=sel.options[sel.selectedIndex];const pname=o.dataset.name,bp=parseFloat(o.dataset.price),stock=parseInt(o.dataset.stock);
        const qty=parseInt(document.getElementById('sellQuantity').value)||0,sp=parseFloat(document.getElementById('sellingPrice').value)||0;
        const cname=document.getElementById('customerName')?.value.trim()||'';
        if(qty<=0){Swal.fire({icon:'warning',title:'Error',text:'Enter quantity!'});return;}
        if(sp<=0){Swal.fire({icon:'warning',title:'Error',text:'Enter selling price!'});return;}
        if(qty>stock){Swal.fire({icon:'error',title:'Error',text:'Stock: '+stock});return;}
        const tc=bp*qty,tr=sp*qty,pl=tr-tc;
        await addDoc(collection(db,'sales'),{purchaseId:sel.value,productName:pname,customerName:cname,purchasePricePerUnit:bp,sellPricePerUnit:sp,quantitySold:qty,totalCost:tc,totalRevenue:tr,profitLoss:pl,date:TD(),userId:uid,createdAt:new Date().toISOString()});
        await updateDoc(doc(db,'purchases',sel.value),{stockRemaining:stock-qty});
        if(pl!==0)await addDoc(collection(db,'profitLossEntries'),{type:pl>0?'profit':'loss',productName:pname,amount:Math.abs(pl),source:'auto',date:TD(),userId:uid,createdAt:new Date().toISOString()});
        Swal.fire({icon:'success',title:'Sale Recorded!',timer:1500,showConfirmButton:false});
        document.getElementById('salesForm').reset();document.getElementById('productDetails').classList.add('hidden');document.getElementById('profitLossDisplay').classList.add('hidden');
        loadProducts();loadSalesHistory();
    });

    async function loadSalesHistory(){const uid=UID();if(!uid)return;const fd=document.getElementById('filterDate')?.value||TD();const snap=await getDocs(query(collection(db,'sales'),where('userId','==',uid)));const tb=document.getElementById('salesTableBody');tb.innerHTML='';const docs=snap.docs.filter(d=>d.data().date===fd).sort((a,b)=>new Date(b.data().createdAt||0)-new Date(a.data().createdAt||0));if(docs.length===0){tb.innerHTML='<tr><td colspan="8" class="text-center py-8 text-gray-500">No sales for '+fd+'</td></tr>';return;}docs.forEach(d=>{const dt=d.data();const ip=(dt.profitLoss||0)>=0;tb.innerHTML+='<tr class="border-b"><td class="p-3 text-sm">'+dt.productName+'</td><td class="p-3 text-center">'+dt.quantitySold+'</td><td class="p-3 text-right text-sm">'+FC(dt.purchasePricePerUnit||0)+'</td><td class="p-3 text-right text-sm">'+FC(dt.sellPricePerUnit||0)+'</td><td class="p-3 text-right text-sm">'+FC(dt.totalCost||0)+'</td><td class="p-3 text-right text-sm">'+FC(dt.totalRevenue||0)+'</td><td class="p-3 text-right font-bold '+(ip?'text-green-600':'text-red-600')+'">'+(ip?'📈':'📉')+' '+FC(Math.abs(dt.profitLoss||0))+'</td><td class="p-3 text-center no-print"><button class="text-red-600" onclick="deleteItem(\'sales\',\''+d.id+'\')"><i class="fas fa-trash"></i></button></td></tr>';});}
    window.loadSalesHistory=loadSalesHistory;
    window.printSales = function(){ const fd = document.getElementById('filterDate')?.value || TD(); printTable('salesTable', 'Sales Report', fd); };
    window.exportSalesCSV = function(){ exportCSV('salesTable', 'sales'); };
    loadProducts();loadSalesHistory();
}

// ============ EXPENSES ============
if(page === 'expenses.html') {
    document.getElementById('expenseDate').value=TD();
    async function load(){const uid=UID();if(!uid)return;const snap=await getDocs(query(collection(db,'expenses'),where('userId','==',uid)));const tb=document.getElementById('expensesTableBody');tb.innerHTML='';if(snap.empty){tb.innerHTML='<tr><td colspan="5" class="text-center py-8 text-gray-500">No expenses</td></tr>';return;}snap.docs.sort((a,b)=>new Date(b.data().createdAt||0)-new Date(a.data().createdAt||0)).forEach(d=>{const dt=d.data();tb.innerHTML+='<tr class="border-b"><td class="p-3"><input type="checkbox" value="'+d.id+'"></td><td class="p-3">'+dt.reason+'</td><td class="p-3">'+FC(dt.cost)+'</td><td class="p-3">'+dt.date+'</td><td class="p-3 no-print"><button class="text-blue-600 mr-2" onclick="editExpense(\''+d.id+'\')"><i class="fas fa-edit"></i></button><button class="text-red-600" onclick="deleteItem(\'expenses\',\''+d.id+'\')"><i class="fas fa-trash"></i></button></td></tr>';});}
    document.getElementById('expenseForm')?.addEventListener('submit',async function(e){e.preventDefault();const uid=UID();await addDoc(collection(db,'expenses'),{reason:document.getElementById('expenseReason').value,cost:parseFloat(document.getElementById('expenseCost').value)||0,date:document.getElementById('expenseDate').value,userId:uid,createdAt:new Date().toISOString()});Swal.fire({icon:'success',title:'Added!',timer:1000,showConfirmButton:false});document.getElementById('expenseForm').reset();document.getElementById('expenseDate').value=TD();document.getElementById('expenseModal').classList.remove('active');load();});
    window.openExpenseModal=function(){document.getElementById('expenseModalTitle').textContent='Add New Expense';document.getElementById('expenseForm').reset();document.getElementById('expenseId').value='';document.getElementById('expenseDate').value=TD();document.getElementById('expenseModal').classList.add('active');};
    window.closeExpenseModal=function(){document.getElementById('expenseModal').classList.remove('active');};
    window.editExpense=async function(id){const s=await getDoc(doc(db,'expenses',id));if(s.exists()){const d=s.data();document.getElementById('expenseModalTitle').textContent='Edit Expense';document.getElementById('expenseId').value=id;document.getElementById('expenseReason').value=d.reason;document.getElementById('expenseCost').value=d.cost;document.getElementById('expenseDate').value=d.date;document.getElementById('expenseModal').classList.add('active');}};
    window.printExpenses = function(){ printTable('expensesTable', 'Expense Report', TD()); };
    window.exportExpensesCSV = function(){ exportCSV('expensesTable', 'expenses'); };
    load();
}

// ============ COLLECTIONS ============
if(page === 'collections.html'){(async function(){const uid=UID();if(!uid)return;const today=TD();const snap=await getDocs(query(collection(db,'profitLossEntries'),where('userId','==',uid)));const pb=document.getElementById('profitEntries'),lb=document.getElementById('lossEntries');pb.innerHTML='';lb.innerHTML='';let tp=0,tl=0;const entries=snap.docs.filter(d=>d.data().date===today).sort((a,b)=>new Date(b.data().createdAt||0)-new Date(a.data().createdAt||0));if(entries.length===0){pb.innerHTML='<tr><td colspan="5" class="text-center py-4 text-gray-500">No entries</td></tr>';lb.innerHTML='<tr><td colspan="5" class="text-center py-4 text-gray-500">No entries</td></tr>';}else entries.forEach(d=>{const dt=d.data();const row='<tr class="border-b"><td class="p-3">'+dt.productName+'</td><td class="p-3 '+(dt.type==='profit'?'text-green-600':'text-red-600')+'">'+FC(dt.amount)+'</td><td class="p-3"><span class="badge badge-'+(dt.source==='auto'?'success':'warning')+'">'+dt.source+'</span></td><td class="p-3">'+dt.date+'</td><td class="p-3 no-print"><button class="text-red-600" onclick="deleteItem(\'profitLossEntries\',\''+d.id+'\')"><i class="fas fa-trash"></i></button></td></tr>';if(dt.type==='profit'){tp+=dt.amount;pb.innerHTML+=row;}else{tl+=dt.amount;lb.innerHTML+=row;}});document.getElementById('totalProfit').textContent=FC(tp);document.getElementById('totalLoss').textContent=FC(tl);document.getElementById('netCollection').textContent=FC(tp-tl);})();}

// ============ BALANCE ============
if(page === 'balance.html'){document.getElementById('balanceDate').value=TD();window.loadBalance=async function(){const uid=UID();if(!uid)return;const date=document.getElementById('balanceDate').value;const[sS,eS]=await Promise.all([getDocs(query(collection(db,'sales'),where('userId','==',uid))),getDocs(query(collection(db,'expenses'),where('userId','==',uid)))]);const ts=sS.docs.filter(d=>d.data().date===date).reduce((s,d)=>s+(d.data().totalRevenue||d.data().sellingPrice||0),0);const tp=sS.docs.filter(d=>d.data().date===date).reduce((s,d)=>s+(d.data().totalCost||((d.data().purchasePricePerUnit||0)*(d.data().quantitySold||0))),0);const te=eS.docs.filter(d=>d.data().date===date).reduce((s,d)=>s+(d.data().cost||0),0);document.getElementById('totalSales').textContent=FC(ts);document.getElementById('totalPurchases').textContent=FC(tp);document.getElementById('totalExpenses').textContent=FC(te);document.getElementById('netBalance').textContent=FC(ts-tp-te);};loadBalance();}

console.log('✅ User App Ready - Page:', page);