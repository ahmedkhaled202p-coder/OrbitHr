'use strict';

const APP_NAME = 'أوربت للاستشارات الهندسية';
const APP_VERSION = '4.3.0-ready';
const APP_KEY = 'peopleflow_hr_v1'; // الحفاظ على بيانات الإصدارات السابقة
const SESSION_KEY = 'peopleflow_session_v1';
const VIEW_KEY = 'peopleflow_view_v1';
const DEFAULT_BRANCHES = ['القاهرة','الجيزة','الإسكندرية'];
const DEFAULT_DEPARTMENTS = ['الموارد البشرية','العمليات','المبيعات','الحسابات','الدعم الفني'];
const DEFAULT_LEAVE_TYPES = [{id:'annual',name:'سنوية',paid:true,annualDays:21},{id:'sick',name:'مرضية',paid:true,annualDays:14},{id:'casual',name:'عارضة',paid:true,annualDays:7},{id:'unpaid',name:'بدون راتب',paid:false,annualDays:0},{id:'maternity',name:'وضع ورعاية طفل',paid:true,annualDays:90}];
const DEFAULT_EXPENSE_CATEGORIES = ['إيجارات','مرافق','رواتب وخدمات','مستلزمات مكتبية','صيانة','انتقالات','ضيافة','اتصالات وإنترنت','رسوم حكومية','أخرى'];
const DEFAULT_DEDUCTION_TYPES = ['جزاء إداري','غياب','تأخير','سلفة','تلف أو فقد عهدة','أخرى'];
const DEFAULT_REWARD_TYPES = ['حافز أداء','تحقيق مستهدف','مكافأة استثنائية','عمل إضافي مميز','مكافأة مناسبة','أخرى'];
const DEFAULT_DOCUMENT_CATEGORIES = ['عقد عمل','بطاقة هوية','جواز سفر','مؤهل دراسي','شهادة خبرة','تأمينات','ترخيص مهني','إقرار وسياسة','أخرى'];
const DEFAULT_PERMISSION_PROFILES = [
  {id:'hr',name:'موظف الموارد البشرية',permissions:['dashboard','services','organization','approvals','selfservice','employees','documents','attendance','leaves','shifts','missions','adjustments','custody','reports','holidays','permissions','decisions','meetings','shiftRequests','workInterruptions','evaluations','recruitment','terminations','tasks','complaints','letters','notifications','announcements']},
  {id:'finance',name:'موظف المالية',permissions:['dashboard','services','expenses','adjustments','custody','payroll','reports','advances','dues']}
];
const WEEK_DAYS = [{id:'0',name:'الأحد'},{id:'1',name:'الإثنين'},{id:'2',name:'الثلاثاء'},{id:'3',name:'الأربعاء'},{id:'4',name:'الخميس'},{id:'5',name:'الجمعة'},{id:'6',name:'السبت'}];
const CURRENCIES = {EGP:'جنيه مصري',SAR:'ريال سعودي',AED:'درهم إماراتي',QAR:'ريال قطري',KWD:'دينار كويتي',BHD:'دينار بحريني',OMR:'ريال عُماني',JOD:'دينار أردني',USD:'دولار أمريكي',EUR:'يورو',GBP:'جنيه إسترليني'};
const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const uid = (p='id') => `${p}_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
const todayISO = () => new Date().toISOString().slice(0,10);
const monthISO = () => new Date().toISOString().slice(0,7);
const currentLocale = () => state?.settings?.language==='en'?'en-US':'ar-EG';
const fmtDate = d => d ? new Intl.DateTimeFormat(currentLocale(),{year:'numeric',month:'short',day:'numeric'}).format(new Date(d+'T12:00:00')) : '-';
const fmtTime = d => d ? new Intl.DateTimeFormat(currentLocale(),{hour:'2-digit',minute:'2-digit'}).format(new Date(d)) : '-';
const money = (n,currency=state.settings.currency||'EGP') => {try{return new Intl.NumberFormat(currentLocale(),{style:'currency',currency:CURRENCIES[currency]?currency:'EGP',maximumFractionDigits:2}).format(Number(n||0))}catch{return `${Number(n||0).toFixed(2)} ${currency}`}};
const minutesToHM = m => `${Math.floor((m||0)/60)}س ${Math.round((m||0)%60)}د`;
const escapeHTML = str => String(str ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));

function sanitizeClientState(data){
  if(!data||typeof data!=='object')return data;
  const clone=JSON.parse(JSON.stringify(data));
  const scrub=obj=>{if(Array.isArray(obj))return obj.forEach(scrub);if(obj&&typeof obj==='object'){delete obj.password;delete obj.passwordHash;delete obj.password_hash;Object.values(obj).forEach(scrub)}};
  scrub(clone);
  return clone;
}
function storeClientState(){try{localStorage.setItem(APP_KEY,JSON.stringify(sanitizeClientState(state)));}catch(e){}}

function seed(){
  const now = new Date();
  const isoAt=(days,h,m=0)=>{const d=new Date(now);d.setDate(d.getDate()+days);d.setHours(h,m,0,0);return d.toISOString()};
  return {
    settings:{company:APP_NAME,currency:'EGP',language:'ar',workDays:26,lateDeductionMethod:'salary',lateDeductionPerMinute:1.5,overtimeCalculationMethod:'salary',overtimeMultiplier:1.5,overtimeRatePerHour:45,currentMonthPayrollMode:'to_date',geofenceLat:30.0444,geofenceLng:31.2357,geofenceRadius:300,requireFace:false,requireGPS:false,theme:'light',branches:[...DEFAULT_BRANCHES],branchCurrencies:{'القاهرة':'EGP','الجيزة':'EGP','الإسكندرية':'EGP'},departments:[...DEFAULT_DEPARTMENTS],leaveTypes:DEFAULT_LEAVE_TYPES.map(x=>({...x})),expenseCategories:[...DEFAULT_EXPENSE_CATEGORIES],deductionTypes:[...DEFAULT_DEDUCTION_TYPES],rewardTypes:[...DEFAULT_REWARD_TYPES],documentCategories:[...DEFAULT_DOCUMENT_CATEGORIES],permissionProfiles:DEFAULT_PERMISSION_PROFILES.map(x=>({...x,permissions:[...x.permissions]}))},
    users:[
      {id:'u1',employeeId:'e1',name:'أحمد محمود',email:'admin@hr.local',role:'admin',active:true},
      {id:'u2',employeeId:'e2',name:'سارة علي',email:'manager@hr.local',role:'manager',active:true},
      {id:'u3',employeeId:'e3',name:'محمد حسن',email:'employee@hr.local',role:'employee',active:true}
    ],
    employees:[
      {id:'e1',code:'EMP-001',name:'أحمد محمود',email:'admin@hr.local',phone:'01010000001',department:'الموارد البشرية',jobTitle:'مدير الموارد البشرية',branch:'القاهرة',company:APP_NAME,hireDate:'2022-02-01',salary:18000,shiftId:'s1',managerId:'',status:'active'},
      {id:'e2',code:'EMP-002',name:'سارة علي',email:'manager@hr.local',phone:'01010000002',department:'العمليات',jobTitle:'مدير عمليات',branch:'القاهرة',company:APP_NAME,hireDate:'2022-06-15',salary:15000,shiftId:'s1',managerId:'e1',status:'active'},
      {id:'e3',code:'EMP-003',name:'محمد حسن',email:'employee@hr.local',phone:'01010000003',department:'المبيعات',jobTitle:'مندوب مبيعات',branch:'الجيزة',company:APP_NAME,hireDate:'2024-01-10',salary:9000,shiftId:'s1',managerId:'e2',status:'active'},
      {id:'e4',code:'EMP-004',name:'مريم يوسف',email:'mariam@company.com',phone:'01010000004',department:'الحسابات',jobTitle:'محاسب',branch:'القاهرة',company:APP_NAME,hireDate:'2023-09-01',salary:11000,shiftId:'s1',managerId:'e1',status:'active'},
      {id:'e5',code:'EMP-005',name:'عمر خالد',email:'omar@company.com',phone:'01010000005',department:'الدعم الفني',jobTitle:'مهندس دعم',branch:'الإسكندرية',company:APP_NAME,hireDate:'2025-03-20',salary:12000,shiftId:'s2',managerId:'e2',status:'active'}
    ],
    shifts:[
      {id:'s1',name:'الوردية الصباحية',start:'09:00',end:'17:00',grace:15,workDays:['0','1','2','3','4'],daySchedules:{'0':{enabled:true,start:'09:00',end:'17:00'},'1':{enabled:true,start:'09:00',end:'17:00'},'2':{enabled:true,start:'09:00',end:'17:00'},'3':{enabled:true,start:'09:00',end:'17:00'},'4':{enabled:true,start:'09:00',end:'17:00'},'5':{enabled:false,start:'09:00',end:'17:00'},'6':{enabled:false,start:'09:00',end:'17:00'}}},
      {id:'s2',name:'الوردية المسائية',start:'14:00',end:'22:00',grace:10,workDays:['0','1','2','3','4'],daySchedules:{'0':{enabled:true,start:'14:00',end:'22:00'},'1':{enabled:true,start:'14:00',end:'22:00'},'2':{enabled:true,start:'14:00',end:'22:00'},'3':{enabled:true,start:'14:00',end:'22:00'},'4':{enabled:true,start:'14:00',end:'22:00'},'5':{enabled:false,start:'14:00',end:'22:00'},'6':{enabled:false,start:'14:00',end:'22:00'}}}
    ],
    attendance:[
      {id:uid('a'),employeeId:'e1',date:todayISO(),checkIn:isoAt(0,8,55),checkOut:null,lateMinutes:0,overtimeMinutes:0,status:'present',location:'المقر الرئيسي',faceVerified:true,geoVerified:true},
      {id:uid('a'),employeeId:'e2',date:todayISO(),checkIn:isoAt(0,9,8),checkOut:null,lateMinutes:0,overtimeMinutes:0,status:'present',location:'المقر الرئيسي',faceVerified:true,geoVerified:true},
      {id:uid('a'),employeeId:'e3',date:todayISO(),checkIn:isoAt(0,9,24),checkOut:null,lateMinutes:9,overtimeMinutes:0,status:'late',location:'فرع الجيزة',faceVerified:false,geoVerified:true},
      {id:uid('a'),employeeId:'e4',date:todayISO(),checkIn:isoAt(0,8,48),checkOut:null,lateMinutes:0,overtimeMinutes:0,status:'present',location:'المقر الرئيسي',faceVerified:false,geoVerified:false},
      {id:uid('a'),employeeId:'e3',date:new Date(now-Date.now()%86400000-86400000).toISOString().slice(0,10),checkIn:isoAt(-1,9,5),checkOut:isoAt(-1,17,40),lateMinutes:0,overtimeMinutes:40,status:'present',location:'فرع الجيزة',faceVerified:true,geoVerified:true}
    ],
    leaves:[
      {id:'l1',employeeId:'e3',type:'سنوية',from:todayISO(),to:todayISO(),days:1,reason:'ظرف عائلي',status:'pending',createdAt:new Date().toISOString()},
      {id:'l2',employeeId:'e4',type:'مرضية',from:'2026-07-08',to:'2026-07-09',days:2,reason:'تقرير طبي',status:'approved',createdAt:'2026-07-07T10:00:00Z'}
    ],
    missions:[{id:'m1',employeeId:'e3',title:'زيارة عميل',date:todayISO(),from:'11:00',to:'14:00',location:'مدينة نصر',status:'approved',notes:'عرض الخدمة الجديدة'}],
    expenses:[{id:'x1',title:'مستلزمات تشغيل المكتب',branch:'القاهرة',currency:'EGP',date:todayISO(),category:'مستلزمات مكتبية',supplier:'مورد تجريبي',paymentMethod:'تحويل بنكي',invoiceNo:'INV-001',amount:1280,description:'شراء أدوات ومستلزمات تشغيل للمكتب',custodyId:'c2',attachmentName:'فاتورة-تجريبية.pdf',attachmentType:'application/pdf',attachmentData:'',status:'approved',createdBy:'u1',createdAt:new Date().toISOString()}],
    adjustments:[
      {id:'adj1',kind:'reward',employeeId:'e3',date:todayISO(),rewardType:'تحقيق مستهدف',amount:500,reason:'تحقيق مستهدف المبيعات',status:'approved',createdAt:new Date().toISOString()},
      {id:'adj2',kind:'deduction',employeeId:'e3',date:todayISO(),deductionType:'جزاء إداري',calculationMethod:'fixed',days:0,workDaysBasis:26,dailyRate:0,amount:150,reason:'خصم إداري تجريبي',status:'pending',createdAt:new Date().toISOString()}
    ],
    custodies:[
      {id:'c1',custodyType:'asset',employeeId:'e5',branch:'الإسكندرية',item:'لابتوب Dell Latitude',serial:'ORB-LT-205',quantity:1,value:35000,assignedDate:'2025-03-20',returnDate:'',returnedCash:0,status:'assigned',notes:'الجهاز مع الشاحن والحقيبة'},
      {id:'c2',custodyType:'financial',employeeId:'e4',branch:'القاهرة',item:'عهدة مشتريات المكتب - يوليو',serial:'CASH-2026-07',quantity:1,value:5000,assignedDate:todayISO(),returnDate:'',returnedCash:0,status:'assigned',notes:'تُسوّى من خلال مصروفات الشركة المرتبطة'}
    ],
    holidays:[{id:'h1',name:'عطلة رسمية تجريبية',from:todayISO(),to:todayISO(),branch:'',paid:'true',notes:'تُطبق على جميع الفروع',status:'active'}],
    permissions:[{id:'pr1',employeeId:'e3',date:todayISO(),from:'13:00',to:'15:00',reason:'موعد شخصي',status:'pending',createdAt:new Date().toISOString()}],
    decisions:[{id:'d1',number:'DEC-001',title:'اعتماد سياسة العمل المرن',date:todayISO(),employeeId:'',branch:'القاهرة',notes:'قرار إداري تجريبي',status:'issued'}],
    meetings:[{id:'mt1',title:'اجتماع متابعة المشروعات',date:todayISO(),from:'10:00',to:'11:00',location:'قاعة الاجتماعات',attendees:'مديرو الأقسام',notes:'مراجعة نسب الإنجاز',status:'scheduled'}],
    shiftRequests:[{id:'sr1',employeeId:'e3',date:todayISO(),requestType:'overtime',targetShiftId:'',hours:2,reason:'إنهاء عرض عميل',status:'pending'}],
    biometricDevices:[{id:'bd1',name:'جهاز بصمة المقر الرئيسي',branch:'القاهرة',deviceType:'بصمة وجه وإصبع',serial:'ORB-BIO-001',ip:'192.168.1.50',lastSync:new Date().toISOString(),status:'connected'}],
    workInterruptions:[],
    evaluations:[{id:'ev1',employeeId:'e3',period:monthISO(),evaluatorId:'e2',score:82,strengths:'التواصل مع العملاء',improvements:'إدارة الوقت',status:'draft'}],
    recruitment:[{id:'rc1',candidateName:'مرشح تجريبي',jobTitle:'مهندس موقع',department:'العمليات',branch:'القاهرة',phone:'01000000000',email:'candidate@example.com',stage:'interview',interviewDate:todayISO(),notes:'مقابلة أولية'}],
    terminations:[],
    advances:[{id:'av1',employeeId:'e4',date:todayISO(),amount:2000,installments:2,startMonth:monthISO(),reason:'سلفة موظف',status:'pending'}],
    tasks:[{id:'tk1',employeeId:'e5',title:'مراجعة أجهزة الشبكة',date:todayISO(),dueDate:todayISO(),priority:'high',notes:'رفع تقرير بالحالة',status:'in_progress'}],
    dues:[{id:'du1',employeeId:'e3',date:todayISO(),type:'بدل انتقال',amount:350,description:'مأمورية عميل',status:'approved'}],
    complaints:[{id:'cp1',employeeId:'e3',againstEmployeeId:'',type:'complaint',date:todayISO(),title:'طلب مراجعة إدارية',details:'سجل تجريبي لعرض دورة الشكوى',penaltyAmount:0,status:'open'}],
    letters:[{id:'lt1',employeeId:'e4',type:'مفردات مرتب',date:todayISO(),subject:'إفادة مفردات راتب',body:'خطاب صادر لأغراض إدارية',status:'issued'}],
    notifications:[{id:'nt1',title:'تحديث نظام الموارد البشرية',audience:'all',date:todayISO(),message:'تم إطلاق مركز الخدمات الجديد.',status:'sent'}],
    customPages:[{id:'pg1',title:'دليل الموظف',slug:'employee-guide',content:'مرحبًا بك في دليل سياسات وإجراءات الشركة.',visibility:'employees',status:'published'}],
    announcements:[{id:'an1',title:'مرحبًا بمركز الخدمات',from:todayISO(),to:todayISO(),audience:'all',message:'يمكن الآن إدارة الخدمات الإدارية من مكان واحد.',status:'published'}],
    documents:[{id:'doc1',employeeId:'e3',category:'عقد عمل',title:'عقد العمل السنوي',number:'CON-2026-003',issueDate:'2026-01-01',expiryDate:new Date(now.getTime()+20*86400000).toISOString().slice(0,10),notes:'عقد تجريبي قابل للتجديد',attachmentName:'',attachmentType:'',attachmentData:'',createdAt:new Date().toISOString()}],
    auditLog:[{id:'log1',date:new Date().toISOString(),userId:'u1',userName:'أحمد محمود',action:'تهيئة النظام',module:'النظام',details:'إنشاء بيانات النسخة التجريبية'}],
    payroll:[]
  };
}

let state = loadState();
let currentUser = loadSession();
let currentView = loadView();
let sidebarOpen = false;
let servicesMenuOpen = false;
let settingsActiveGroup = 'company';
let permissionActiveGroupId = ''; // v3.8.2: selected permission group editor
let faceVerifiedSession = false;
let cameraStream = null;
let pendingEmployeePhoto = '';
let pendingExpenseAttachment = null;
let pendingDocumentAttachment = null;

function loadState(){
  try{return normalizeState(sanitizeClientState(JSON.parse(localStorage.getItem(APP_KEY)) || seed()))}catch{return normalizeState(sanitizeClientState(seed()))}
}
function normalizeState(data){
  if(!data||typeof data!=='object')return seed();
  data.settings=data.settings||{};data.settings.timezone=data.settings.timezone||'Africa/Cairo';
  data.employees=Array.isArray(data.employees)?data.employees:[];
  const clean=list=>[...new Set((list||[]).map(v=>String(v||'').trim()).filter(Boolean))];
  data.settings.branches=clean([...(Array.isArray(data.settings.branches)?data.settings.branches:DEFAULT_BRANCHES),...data.employees.map(e=>e.branch)]);
  data.settings.departments=clean([...(Array.isArray(data.settings.departments)?data.settings.departments:DEFAULT_DEPARTMENTS),...data.employees.map(e=>e.department)]);
  data.settings.expenseCategories=clean([...(Array.isArray(data.settings.expenseCategories)?data.settings.expenseCategories:DEFAULT_EXPENSE_CATEGORIES),...(Array.isArray(data.expenses)?data.expenses:[]).map(x=>x.category)]);
  if(!data.settings.expenseCategories.length)data.settings.expenseCategories=[...DEFAULT_EXPENSE_CATEGORIES];
  data.settings.deductionTypes=clean([...(Array.isArray(data.settings.deductionTypes)?data.settings.deductionTypes:DEFAULT_DEDUCTION_TYPES),...(Array.isArray(data.adjustments)?data.adjustments:[]).filter(x=>x.kind==='deduction').map(x=>x.deductionType||x.type)]);
  if(!data.settings.deductionTypes.length)data.settings.deductionTypes=[...DEFAULT_DEDUCTION_TYPES];
  data.settings.rewardTypes=clean([...(Array.isArray(data.settings.rewardTypes)?data.settings.rewardTypes:DEFAULT_REWARD_TYPES),...(Array.isArray(data.adjustments)?data.adjustments:[]).filter(x=>x.kind==='reward').map(x=>x.rewardType||x.type)]);
  if(!data.settings.rewardTypes.length)data.settings.rewardTypes=[...DEFAULT_REWARD_TYPES];
  data.settings.currency=CURRENCIES[data.settings.currency]?data.settings.currency:'EGP';
  data.settings.branchCurrencies=(data.settings.branchCurrencies&&typeof data.settings.branchCurrencies==='object')?data.settings.branchCurrencies:{};
  data.settings.branches.forEach(b=>{const c=data.settings.branchCurrencies[b];data.settings.branchCurrencies[b]=CURRENCIES[c]?c:data.settings.currency});
  Object.keys(data.settings.branchCurrencies).forEach(b=>{if(!data.settings.branches.includes(b))delete data.settings.branchCurrencies[b]});
  delete data.settings.branchCommissions;
  if(!data.settings.company||data.settings.company==='شركة النخبة للخدمات')data.settings.company=APP_NAME;
  data.settings.workDays=Math.max(1,Number(data.settings.workDays||26));
  data.settings.lateDeductionMethod=['salary','fixed'].includes(data.settings.lateDeductionMethod)?data.settings.lateDeductionMethod:'salary';
  data.settings.lateDeductionPerMinute=Math.max(0,Number(data.settings.lateDeductionPerMinute||0));
  data.settings.overtimeCalculationMethod=['salary','fixed'].includes(data.settings.overtimeCalculationMethod)?data.settings.overtimeCalculationMethod:'salary';
  data.settings.overtimeMultiplier=Math.max(0,Number(data.settings.overtimeMultiplier||1.5));
  data.settings.overtimeRatePerHour=Math.max(0,Number(data.settings.overtimeRatePerHour||0));
  data.settings.currentMonthPayrollMode=['to_date','full'].includes(data.settings.currentMonthPayrollMode)?data.settings.currentMonthPayrollMode:'to_date';
  data.users=Array.isArray(data.users)?data.users:[];data.users.forEach(u=>{delete u.password;delete u.passwordHash;delete u.password_hash});
  data.employees.forEach(e=>{if(!e.company||e.company==='شركة النخبة للخدمات')e.company=APP_NAME});
  data.leaves=Array.isArray(data.leaves)?data.leaves:[];
  data.missions=Array.isArray(data.missions)?data.missions:[];
  data.shifts=Array.isArray(data.shifts)?data.shifts:[];
  data.shifts.forEach(s=>{
    s.name=String(s.name||'وردية عمل').trim();s.start=s.start||'09:00';s.end=s.end||'17:00';s.grace=Number(s.grace||0);
    const oldDays=Array.isArray(s.workDays)?s.workDays.map(String):[];
    const raw=(s.daySchedules&&typeof s.daySchedules==='object')?s.daySchedules:{};
    s.daySchedules={};
    WEEK_DAYS.forEach(d=>{const r=raw[d.id]||{};s.daySchedules[d.id]={enabled:typeof r.enabled==='boolean'?r.enabled:oldDays.includes(d.id),start:r.start||s.start,end:r.end||s.end}});
    s.workDays=WEEK_DAYS.filter(d=>s.daySchedules[d.id].enabled).map(d=>d.id);
    if(!s.workDays.length){['0','1','2','3','4'].forEach(id=>s.daySchedules[id].enabled=true);s.workDays=['0','1','2','3','4']}
    const first=s.daySchedules[s.workDays[0]];s.start=first.start;s.end=first.end;
  });
  data.expenses=Array.isArray(data.expenses)?data.expenses:[];
  data.expenses.forEach(x=>{
    const legacyEmployee=data.employees.find(e=>e.id===x.employeeId);
    x.branch=x.branch||legacyEmployee?.branch||data.settings.branches[0]||'';
    x.currency=CURRENCIES[x.currency]?x.currency:(data.settings.branchCurrencies?.[x.branch]||data.settings.currency||'EGP');
    x.category=x.category||'أخرى';
    x.title=String(x.title||x.name||x.expenseName||x.description||x.category||'مصروف شركة').trim();
    x.supplier=x.supplier||'';
    delete x.name;delete x.expenseName;
    x.paymentMethod=x.paymentMethod||'نقدي';
    x.invoiceNo=x.invoiceNo||'';
    x.custodyId=String(x.custodyId||'').trim();
    x.attachmentName=x.attachmentName||x.receipt||'';
    x.attachmentType=x.attachmentType||'';
    x.attachmentData=x.attachmentData||'';
    x.createdAt=x.createdAt||new Date().toISOString();
    x.createdBy=x.createdBy||'';
    delete x.receipt;
  });
  data.payroll=Array.isArray(data.payroll)?data.payroll:[];
  data.payroll.forEach(p=>{
    p.status=['draft','reviewed','approved','paid','locked'].includes(p.status)?p.status:'draft';
    p.insuranceDeduction=Math.max(0,Number(p.insuranceDeduction||0));p.taxDeduction=Math.max(0,Number(p.taxDeduction||0));
    p.statutoryDeductions=Math.max(0,Number(p.statutoryDeductions||p.insuranceDeduction+p.taxDeduction||0));
    p.contractBase=Math.max(0,Number(p.contractBase||p.base||0));p.base=Math.max(0,Number(p.base||0));
    p.rewards=Math.max(0,Number(p.rewards||0));p.overtime=Math.max(0,Number(p.overtime||0));
    p.otherDeductions=Math.max(0,Number(p.otherDeductions||Math.max(0,Number(p.deductions||0)-p.statutoryDeductions)));
    p.deductions=Math.max(0,Number(p.deductions||p.otherDeductions+p.statutoryDeductions));
    p.gross=Math.max(0,Number(p.gross||p.base+p.overtime+p.rewards));p.net=Number.isFinite(Number(p.net))?Number(p.net):p.gross-p.deductions;
    p.calculationMode=['to_date','full'].includes(p.calculationMode)?p.calculationMode:'full';
    p.periodEnd=p.periodEnd||`${p.month||monthISO()}-01`;p.scheduledDays=Math.max(0,Number(p.scheduledDays||0));p.eligibleDays=Math.max(0,Number(p.eligibleDays||p.scheduledDays||0));
  });
  data.documents=Array.isArray(data.documents)?data.documents:[];
  data.documents.forEach(x=>{x.category=x.category||'أخرى';x.title=String(x.title||x.category||'مستند موظف').trim();x.number=x.number||'';x.issueDate=x.issueDate||'';x.expiryDate=x.expiryDate||'';x.notes=x.notes||'';x.attachmentName=x.attachmentName||'';x.attachmentType=x.attachmentType||'';x.attachmentData=x.attachmentData||'';x.createdAt=x.createdAt||new Date().toISOString();});
  data.auditLog=Array.isArray(data.auditLog)?data.auditLog:[];
  data.employees.forEach(e=>{['nationalId','birthDate','gender','address','emergencyName','emergencyPhone','bankName','bankAccount','insuranceNumber','taxNumber','contractType','contractStart','contractEnd','probationEnd'].forEach(k=>e[k]=e[k]||'');e.insuranceDeduction=Math.max(0,Number(e.insuranceDeduction||0));e.taxDeduction=Math.max(0,Number(e.taxDeduction||0));});
  data.adjustments=Array.isArray(data.adjustments)?data.adjustments:[];
  data.adjustments.forEach(x=>{
    x.kind=x.kind==='reward'?'reward':'deduction';
    x.calculationMethod=x.kind==='deduction'&&x.calculationMethod==='days'?'days':'fixed';
    x.deductionType=x.kind==='deduction'?String(x.deductionType||x.type||'أخرى').trim():'';
    x.rewardType=x.kind==='reward'?String(x.rewardType||x.type||'أخرى').trim():'';
    x.days=x.calculationMethod==='days'?Math.max(0,Number(x.days||0)):0;
    x.amount=Math.max(0,Number(x.amount||0));
    x.workDaysBasis=x.calculationMethod==='days'?Math.max(1,Number(x.workDaysBasis||data.settings.workDays||26)):0;
    x.dailyRate=x.calculationMethod==='days'?Math.max(0,Number(x.dailyRate||0)):0;
    delete x.type;
  });
  data.custodies=Array.isArray(data.custodies)?data.custodies:[];
  data.custodies.forEach(x=>{
    x.custodyType=x.custodyType==='financial'?'financial':'asset';
    x.item=String(x.item||x.title||(x.custodyType==='financial'?'عهدة مالية':'عهدة عينية')).trim();
    x.serial=String(x.serial||'').trim();
    x.quantity=x.custodyType==='financial'?1:Math.max(1,Number(x.quantity||1));
    x.value=Math.max(0,Number(x.value||x.amount||0));
    x.returnedCash=Math.max(0,Number(x.returnedCash||0));
    x.assignedDate=x.assignedDate||x.date||todayISO();
    x.returnDate=x.returnDate||'';
    x.status=['assigned','returned','damaged','lost'].includes(x.status)?x.status:'assigned';
    const responsible=data.employees.find(e=>e.id===x.employeeId);
    x.branch=String(x.branch||responsible?.branch||data.settings.branches?.[0]||'').trim();
    if(x.branch&&!data.settings.branches.includes(x.branch))x.branch=data.settings.branches[0]||x.branch;
    x.notes=x.notes||'';
    delete x.amount;delete x.title;delete x.date;
  });
  data.expenses.forEach(x=>{const c=data.custodies.find(v=>v.id===x.custodyId);if(!c||c.custodyType!=='financial'||c.branch!==x.branch)x.custodyId='';});
  ['holidays','permissions','decisions','meetings','shiftRequests','biometricDevices','workInterruptions','evaluations','recruitment','terminations','advances','tasks','dues','complaints','letters','notifications','customPages','announcements'].forEach(k=>{data[k]=Array.isArray(data[k])?data[k]:[]});
  const rawLeaveTypes=Array.isArray(data.settings.leaveTypes)?data.settings.leaveTypes:DEFAULT_LEAVE_TYPES;
  data.settings.leaveTypes=rawLeaveTypes.map((x,i)=>typeof x==='string'?{id:`lt_${i}_${x}`,name:x,paid:x!=='بدون راتب',annualDays:0}:{id:x.id||uid('lt'),name:String(x.name||'نوع إجازة').trim(),paid:x.paid!==false,annualDays:Math.max(0,Number(x.annualDays||0))}).filter(x=>x.name);
  if(!data.settings.leaveTypes.length)data.settings.leaveTypes=DEFAULT_LEAVE_TYPES.map(x=>({...x}));
  data.leaves.forEach(l=>{const t=data.settings.leaveTypes.find(x=>x.id===l.leaveTypeId||x.name===l.type);if(t){l.leaveTypeId=t.id;l.type=t.name;if(typeof l.paid!=='boolean')l.paid=t.paid}});
  data.settings.language=['ar','en'].includes(data.settings.language)?data.settings.language:'ar';
  data.settings.documentCategories=clean([...(Array.isArray(data.settings.documentCategories)?data.settings.documentCategories:DEFAULT_DOCUMENT_CATEGORIES),...data.documents.map(x=>x.category)]);
  if(!data.settings.documentCategories.length)data.settings.documentCategories=[...DEFAULT_DOCUMENT_CATEGORIES];
  const rawProfiles=Array.isArray(data.settings.permissionProfiles)?data.settings.permissionProfiles:DEFAULT_PERMISSION_PROFILES;
  const seenProfileIds=new Set(),seenProfileNames=new Set();
  data.settings.permissionProfiles=rawProfiles.map((x,i)=>{
    const name=String(x.name||'دور مخصص').trim();
    let id=String(x.id||`role_${i}`).replace(/[^a-zA-Z0-9_-]/g,'_')||`role_${i}`;
    if(['admin','manager','employee'].includes(id))id=`custom_${id}`;
    while(seenProfileIds.has(id))id=`${id}_${i}`;
    seenProfileIds.add(id);
    if(!name||seenProfileNames.has(name.toLowerCase()))return null;
    seenProfileNames.add(name.toLowerCase());
    return {id,name,permissions:[...new Set((x.permissions||[]).filter(Boolean))]};
  }).filter(Boolean);
  if(!data.settings.permissionProfiles.length)data.settings.permissionProfiles=DEFAULT_PERMISSION_PROFILES.map(x=>({...x,permissions:[...x.permissions]}));
  data.users=Array.isArray(data.users)?data.users:[];
  const seenUserEmployees=new Set(),seenUserEmails=new Set();
  data.users=data.users.filter(u=>{
    u.role=u.role||'employee';u.active=u.active!==false;
    if(Array.isArray(u.permissions))u.permissions=[...new Set(u.permissions.filter(Boolean))];
    const empKey=u.employeeId||'',mailKey=String(u.email||'').trim().toLowerCase();
    if(empKey&&seenUserEmployees.has(empKey))return false;
    if(mailKey&&seenUserEmails.has(mailKey))return false;
    if(empKey)seenUserEmployees.add(empKey);if(mailKey)seenUserEmails.add(mailKey);
    return true;
  });
  return data;
}
function getBranches(){return state.settings.branches||[]}
function getDepartments(){return state.settings.departments||[]}
function getLeaveTypes(){return state.settings.leaveTypes||DEFAULT_LEAVE_TYPES}
function getExpenseCategories(){return state.settings.expenseCategories||DEFAULT_EXPENSE_CATEGORIES}
function getDeductionTypes(){return state.settings.deductionTypes||DEFAULT_DEDUCTION_TYPES}
function getRewardTypes(){return state.settings.rewardTypes||DEFAULT_REWARD_TYPES}
function getDocumentCategories(){return state.settings.documentCategories||DEFAULT_DOCUMENT_CATEGORIES}
function getPermissionProfiles(){return state.settings.permissionProfiles||DEFAULT_PERMISSION_PROFILES}
function allPermissionRoutes(){
  const core=(typeof NAV==='undefined'?[]:NAV.map(n=>n[0]));
  const extra=(typeof EXTRA_MODULES==='undefined'?[]:Object.keys(EXTRA_MODULES));
  return [...new Set([...core,...extra])].filter(Boolean);
}
function normalizePermissionArray(list=[]){
  const allowed=allPermissionRoutes();
  const out=[...new Set((list||[]).map(v=>String(v||'').trim()).filter(v=>allowed.includes(v)))];
  if(out.length&&!out.includes('dashboard'))out.unshift('dashboard');
  if(typeof EXTRA_MODULES!=='undefined'&&out.some(v=>EXTRA_MODULES[v])&&!out.includes('services'))out.splice(Math.min(1,out.length),0,'services');
  return [...new Set(out)];
}
function userHasCustomPermissions(user){return Array.isArray(user?.permissions)}
function accountPermissionLabel(user){if(!user)return '';return `${roleLabel(user.role)}${userHasCustomPermissions(user)?' · صلاحيات مخصصة':''}`}
function documentCategoryOptions(selected=''){return getDocumentCategories().map(v=>`<option value="${escapeHTML(v)}" ${v===selected?'selected':''}>${escapeHTML(v)}</option>`).join('')}
function deductionTypeOptions(selected=''){return getDeductionTypes().map(v=>`<option value="${escapeHTML(v)}" ${v===selected?'selected':''}>${escapeHTML(v)}</option>`).join('')}
function rewardTypeOptions(selected=''){return getRewardTypes().map(v=>`<option value="${escapeHTML(v)}" ${v===selected?'selected':''}>${escapeHTML(v)}</option>`).join('')}
function expenseCategoryOptions(selected=''){return getExpenseCategories().map(v=>`<option value="${escapeHTML(v)}" ${v===selected?'selected':''}>${escapeHTML(v)}</option>`).join('')}
function leaveTypeInfo(idOrName){return getLeaveTypes().find(x=>x.id===idOrName||x.name===idOrName)||{id:idOrName,name:idOrName||'غير محددة',paid:true,annualDays:0}}
function leaveTypeOptions(selected='',employeeId=''){return getLeaveTypes().map(t=>{const b=employeeId?leaveBalance(employeeId,t.id,new Date().getFullYear()):null;return `<option value="${escapeHTML(t.id)}" ${t.id===selected||t.name===selected?'selected':''}>${escapeHTML(t.name)} — ${t.paid?'مدفوعة':'بدون راتب'}${t.annualDays?` — المتبقي ${b}`:''}</option>`}).join('')}
function leaveDaysInYear(employeeId,leaveTypeId,year,statuses=['approved']){return state.leaves.filter(l=>l.employeeId===employeeId&&(l.leaveTypeId===leaveTypeId||leaveTypeInfo(l.leaveTypeId||l.type).id===leaveTypeId)&&statuses.includes(l.status)&&String(l.from||'').startsWith(String(year))).reduce((s,l)=>s+Number(l.days||0),0)}
function leaveBalance(employeeId,leaveTypeId,year=new Date().getFullYear()){const t=leaveTypeInfo(leaveTypeId),entitlement=Math.max(0,Number(t.annualDays||0));return entitlement?Math.max(0,+(entitlement-leaveDaysInYear(employeeId,t.id,year,['approved','pending'])).toFixed(2)):0}
function getBranchCurrency(branch){const c=state.settings.branchCurrencies?.[branch];return CURRENCIES[c]?c:(state.settings.currency||'EGP')}
function currencyLabel(code){return CURRENCIES[code]||code||'غير محددة'}
function branchCurrencyLabel(branch){const code=getBranchCurrency(branch);return `${currencyLabel(code)} (${code})`}
function currencyOptions(selected='EGP'){return Object.entries(CURRENCIES).map(([code,label])=>`<option value="${code}" ${code===selected?'selected':''}>${label} — ${code}</option>`).join('')}
function employeeCurrency(employeeId){return getBranchCurrency(emp(employeeId)?.branch)}
function moneyForEmployee(n,employeeId){return money(n,employeeCurrency(employeeId))}
function expenseBranch(x){return x?.branch||emp(x?.employeeId)?.branch||getBranches()[0]||''}
function expenseCurrency(x){const c=x?.currency;return CURRENCIES[c]?c:getBranchCurrency(expenseBranch(x))}
function moneyForExpense(x){return money(x?.amount||0,expenseCurrency(x))}
function expenseMoneySummary(records,status=''){const list=status?records.filter(x=>x.status===status):records,totals={};list.forEach(x=>{const c=expenseCurrency(x);totals[c]=(totals[c]||0)+Number(x.amount||0)});const entries=Object.entries(totals);return entries.length?entries.map(([c,v])=>money(v,c)).join('<br>'):money(0,state.settings.currency)}
function custodyById(id){return state.custodies.find(x=>x.id===id)}
function custodyTypeLabel(x){return x?.custodyType==='financial'?'عهدة مالية':'عهدة عينية'}
function custodyBranch(x){return x?.branch||emp(x?.employeeId)?.branch||''}
function custodyCurrency(x){return getBranchCurrency(custodyBranch(x))}
function custodyTotalValue(x){return x?.custodyType==='financial'?Number(x?.value||0):Number(x?.value||0)*Number(x?.quantity||1)}
function linkedCustodyExpenses(custodyId,statuses=['approved','pending','reviewed'],excludeId=''){return state.expenses.filter(x=>x.custodyId===custodyId&&x.id!==excludeId&&statuses.includes(x.status))}
function custodyExpenseTotal(x,statuses=['approved'],excludeId=''){return linkedCustodyExpenses(x?.id,statuses,excludeId).reduce((sum,e)=>sum+Number(e.amount||0),0)}
function custodyApprovedSpent(x){return custodyExpenseTotal(x,['approved'])}
function custodyPendingSpent(x){return custodyExpenseTotal(x,['pending','reviewed'])}
function custodyCommitted(x,excludeId=''){return custodyExpenseTotal(x,['approved','pending','reviewed'],excludeId)}
function custodyRemaining(x,excludeId=''){if(!x||x.custodyType!=='financial')return 0;return Math.max(0,Number(x.value||0)-Number(x.returnedCash||0)-custodyCommitted(x,excludeId))}
function expenseCustody(x){return x?.custodyId?custodyById(x.custodyId):null}
function expenseCustodyLabel(x){const c=expenseCustody(x);return c?`${c.item} — ${custodyBranch(c)||'-'} — ${emp(c.employeeId)?.name||'-'}`:'—'}
function financialCustodyOptions(branch,selected='',expenseId=''){const list=state.custodies.filter(c=>c.custodyType==='financial'&&custodyBranch(c)===branch&&(c.status==='assigned'||c.id===selected));return `<option value="">بدون عهدة مالية</option>${list.map(c=>{const available=custodyRemaining(c,expenseId),used=custodyApprovedSpent(c);return `<option value="${c.id}" ${c.id===selected?'selected':''}>${escapeHTML(c.item)} — ${escapeHTML(custodyBranch(c)||'-')} — ${escapeHTML(emp(c.employeeId)?.name||'-')} — متاح ${money(available,custodyCurrency(c))} / مصروف ${money(used,custodyCurrency(c))}</option>`}).join('')}`}
function moneySummary(records,status=''){const list=status?records.filter(x=>x.status===status):records,totals={};list.forEach(x=>{const c=employeeCurrency(x.employeeId);totals[c]=(totals[c]||0)+Number(x.amount||0)});const entries=Object.entries(totals);return entries.length?entries.map(([c,v])=>money(v,c)).join('<br>'):money(0,state.settings.currency)}
function saveState(){
  storeClientState()
  orbitScheduleServerSave();
}
function logAudit(action,module,details=''){
  state.auditLog=Array.isArray(state.auditLog)?state.auditLog:[];
  const u=currentUser||{};state.auditLog.unshift({id:uid('log'),date:new Date().toISOString(),userId:u.id||'',userName:u.name||'النظام',action,module,details:String(details||'')});
  if(state.auditLog.length>1000)state.auditLog=state.auditLog.slice(0,1000);
}
function loadSession(){try{return JSON.parse(sessionStorage.getItem(SESSION_KEY))}catch{return null}}
function saveSession(user){currentUser=user; user ? sessionStorage.setItem(SESSION_KEY,JSON.stringify(user)) : sessionStorage.removeItem(SESSION_KEY)}
function loadView(){try{const hash=String(location.hash||'').replace(/^#\/?/,'').trim();return hash||sessionStorage.getItem(VIEW_KEY)||'dashboard'}catch{return 'dashboard'}}
function saveView(view){try{sessionStorage.setItem(VIEW_KEY,view);const next=`#/${view}`;if(location.hash!==next)history.replaceState(null,'',next)}catch{}}
function emp(id){return state.employees.find(e=>e.id===id)}
function shift(id){return state.shifts.find(s=>s.id===id)}
function parseLocalDate(value){if(value instanceof Date)return new Date(value);if(/^\d{4}-\d{2}-\d{2}$/.test(String(value||'')))return new Date(`${value}T12:00:00`);return new Date(value||Date.now())}
function shiftDaySchedule(sh,dateLike=new Date()){if(!sh)return null;const day=String(parseLocalDate(dateLike).getDay()),r=sh.daySchedules?.[day];if(r)return r.enabled?{...r,day}:null;return (sh.workDays||[]).map(String).includes(day)?{enabled:true,start:sh.start,end:sh.end,day}:null}
function timeToMinutes(value){const [h,m]=String(value||'00:00').split(':').map(Number);return (Number.isFinite(h)?h:0)*60+(Number.isFinite(m)?m:0)}
function shiftDurationMinutes(start,end){let n=timeToMinutes(end)-timeToMinutes(start);if(n<=0)n+=1440;return n}
function shiftWeeklyMinutes(sh){return WEEK_DAYS.reduce((sum,d)=>{const r=sh.daySchedules?.[d.id];return sum+(r?.enabled?shiftDurationMinutes(r.start,r.end):0)},0)}
function shiftDaysSummary(sh){return WEEK_DAYS.filter(d=>sh.daySchedules?.[d.id]?.enabled).map(d=>d.name).join('، ')||'لا توجد أيام'}
function countScheduledShiftDays(shiftId,month){const sh=shift(shiftId);if(!sh)return Number(state.settings.workDays||0);const [y,m]=month.split('-').map(Number),last=new Date(y,m,0).getDate();let total=0;for(let day=1;day<=last;day++){const date=`${month}-${String(day).padStart(2,'0')}`;if(shiftDaySchedule(sh,date))total++}return total}
function ownEmployee(){return emp(currentUser?.employeeId)}
function permissionProfile(role){return getPermissionProfiles().find(x=>x.id===role)}
function userPermissions(user=currentUser){
  if(!user)return [];
  if(user.role==='admin')return allPermissionRoutes();
  if(userHasCustomPermissions(user))return normalizePermissionArray(user.permissions);
  if(user.role==='manager')return normalizePermissionArray(NAV.filter(n=>n[3].includes('manager')).map(n=>n[0]).concat(Object.keys(EXTRA_MODULES||{})));
  if(user.role==='employee')return normalizePermissionArray(NAV.filter(n=>n[3].includes('employee')).map(n=>n[0]));
  return normalizePermissionArray(permissionProfile(user.role)?.permissions||[]);
}
function canAccessRoute(route,user=currentUser){return user?.role==='admin'||userPermissions(user).includes(route)}
function canManage(){if(['admin','manager'].includes(currentUser?.role))return true;if(!currentUser)return false;if(currentUser.role==='employee'&&!userHasCustomPermissions(currentUser))return false;return ['employees','leaves','attendance','documents','expenses','adjustments','custody','payroll','approvals'].some(r=>canAccessRoute(r))}
function canAdmin(){return currentUser?.role==='admin'}
function canOperatePayroll(){return canAdmin()||currentUser?.role==='finance'||canAccessRoute('payroll')}
function visibleEmployees(){if(canManage()||(currentUser?.role!=='employee'&&(canAccessRoute('employees')||canAccessRoute('payroll')||canAccessRoute('expenses'))))return state.employees;return state.employees.filter(e=>e.id===currentUser?.employeeId)}
function roleLabel(r){const base={admin:'مسؤول النظام',manager:'مدير',employee:'موظف'};const ar=base[r]||permissionProfile(r)?.name||r;if(state?.settings?.language==='en')return {admin:'System Administrator',manager:'Manager',employee:'Employee',hr:'HR Officer',finance:'Finance Officer'}[r]||permissionProfile(r)?.name||r;return ar}
function roleOptions(selected='employee'){const fixed=[['employee','موظف'],['manager','مدير'],['admin','مسؤول النظام']],custom=getPermissionProfiles().map(x=>[x.id,x.name]);return [...fixed,...custom.filter(x=>!fixed.some(v=>v[0]===x[0]))].map(([id,name])=>`<option value="${escapeHTML(id)}" ${id===selected?'selected':''}>${escapeHTML(name)}</option>`).join('')}
function employeeAccount(employeeId){return state.users.find(u=>u.employeeId===employeeId)}
function avatarHTML(person,size=36){
  const name=person?.name||'مستخدم';
  const style=`width:${size}px;height:${size}px;${size>=60?'font-size:1.4rem;':''}`;
  if(person?.photo) return `<div class="avatar avatar-photo" style="${style}"><img src="${escapeHTML(person.photo)}" alt="صورة ${escapeHTML(name)}"></div>`;
  return `<div class="avatar" style="${style}">${escapeHTML(name.charAt(0)||'؟')}</div>`;
}
function statusBadge(status){
  const map={active:['نشط','success'],inactive:['غير نشط','neutral'],present:['حاضر','success'],late:['متأخر','warning'],absent:['غائب','danger'],pending:['قيد المراجعة','warning'],approved:['معتمد','success'],rejected:['مرفوض','danger'],paid:['تم الصرف','success'],locked:['مغلق','neutral'],reviewed:['تمت المراجعة','info'],draft:['مسودة','neutral'],assigned:['بعهدة الموظف','warning'],returned:['تم الرد','success'],damaged:['تالف','danger'],lost:['مفقود','danger'],scheduled:['مجدول','info'],completed:['مكتمل','success'],cancelled:['ملغى','danger'],connected:['متصل','success'],disconnected:['غير متصل','danger'],maintenance:['صيانة','warning'],in_progress:['قيد التنفيذ','warning'],issued:['صادر','success'],sent:['تم الإرسال','success'],closed:['مغلق','neutral'],interview:['مقابلة','info'],offered:['عرض وظيفي','warning'],hired:['تم التعيين','success'],suspended:['موقوف','danger'],settled:['تمت التسوية','success'],open:['مفتوح','warning'],resolved:['تم الحل','success'],published:['منشور','success'],expired:['منتهي','danger'],archived:['مؤرشف','neutral'],high:['عالية','danger'],medium:['متوسطة','warning'],low:['منخفضة','neutral']};
  const [label,type]=map[status]||[status,'neutral']; return `<span class="badge badge-${type}">${label}</span>`;
}
function toast(msg,type='success'){
  const el=$('#toast'); el.textContent=msg; el.className=`toast show ${type}`; clearTimeout(window._toast); window._toast=setTimeout(()=>el.className='toast',2800);
}

const NAV=[
  ['dashboard','⌂','لوحة التحكم',['admin','manager','employee']],
  ['services','☷','مركز الخدمات',['admin','manager','employee']],
  ['employees','👥','الموظفون',['admin','manager']],
  ['documents','📁','العقود والمستندات',['admin','manager','employee']],
  ['attendance','◷','الحضور والانصراف',['admin','manager','employee']],
  ['leaves','☂','الإجازات',['admin','manager','employee']],
  ['shifts','↻','الورديات',['admin','manager']],
  ['missions','⌖','المأموريات',['admin','manager','employee']],
  ['expenses','▣','مصروفات الشركة',['admin','manager']],
  ['adjustments','±','الخصومات والمكافآت',['admin','manager','employee']],
  ['custody','▦','العُهد',['admin','manager','employee']],
  ['payroll','💳','الرواتب',['admin','manager','employee']],
  ['reports','▥','التقارير',['admin','manager']],
  ['audit','🛡','سجل النظام',['admin']],
  ['settings','⚙','الإعدادات',['admin']]
];

function render(){
  document.documentElement.dataset.theme=state.settings.theme || 'light';
  if(!currentUser){renderLogin();applyLanguage();return;}
  const allowed=NAV.filter(n=>canAccessRoute(n[0]));
  if(!allowed.some(n=>n[0]===currentView)&&!canAccessRoute(currentView)){currentView='dashboard';saveView(currentView)}
  $('#app').innerHTML=`
    <div class="app-shell">
      ${sidebarOpen?'<div class="sidebar-overlay" onclick="toggleSidebar()"></div>':''}
      <aside class="sidebar ${sidebarOpen?'open':''}">
        <div class="brand brand-orbit"><div class="orbit-brand-mark"><img class="sidebar-company-logo" src="orbit-mark-ui.png" alt="شعار أوربت للاستشارات الهندسية"></div><div class="orbit-brand-copy"><strong>ORBIT</strong><span>أوربت للاستشارات الهندسية</span><small>نظام الموارد البشرية والخدمات</small></div></div>
        <nav class="nav">${allowed.map(n=>`<button class="${currentView===n[0]?'active':''}" onclick="go('${n[0]}')"><span class="nav-icon">${n[1]}</span><span>${n[2]}</span></button>`).join('')}</nav>

      </aside>
      <main class="main">
        <header class="topbar">
          <div style="display:flex;align-items:center;gap:10px"><button class="icon-btn mobile-menu" onclick="toggleSidebar()">☰</button><div><h1>${NAV.find(n=>n[0]===currentView)?.[2]||''}</h1><div class="small muted">${new Intl.DateTimeFormat(currentLocale(),{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date())}</div></div></div>
          <div class="topbar-actions">
            <button class="services-menu-btn" onclick="toggleServicesMenu()" title="كل الخدمات"><span>☷</span><b>الخدمات</b></button>
            <button class="icon-btn lang-toggle" onclick="toggleLanguage()" title="العربية / English">${state.settings.language==='en'?'ع':'EN'}</button>
            <button class="icon-btn" onclick="toggleTheme()" title="الوضع الليلي">${state.settings.theme==='dark'?'☀':'☾'}</button>
            <div class="user-chip">${avatarHTML(ownEmployee()||{name:currentUser.name},36)}<div class="user-meta"><strong class="small">${escapeHTML(currentUser.name)}</strong><div class="small muted">${accountPermissionLabel(currentUser)}</div></div></div>
            <button class="icon-btn" onclick="logout()" title="تسجيل الخروج">↪</button>
          </div>
        </header>
        ${servicesMenuOpen?renderServicesMegaMenu():''}
        <section class="content">${renderView()}</section>
      </main>
    </div>`;
  afterRender();
}

function renderLogin(){
  $('#app').innerHTML=`<div class="login-page">
    <section class="login-visual"><div class="login-company-logo"><img src="orbit-logo-ui.png" alt="شعار أوربت للاستشارات الهندسية"></div><h1>إدارة فريقك وخدماتك من مكان واحد</h1><p>نظام عربي شامل للحضور والموظفين والرواتب ومسارات الاعتماد والتوظيف والتقييم والعُهد والخدمات الذاتية والتقارير.</p><div class="feature-pills"><span>الحضور والبصمة</span><span>الخدمة الذاتية</span><span>مسار الاعتماد</span><span>الرواتب</span><span>التوظيف والتقييم</span><span>التقارير المستقلة</span></div></section>
    <section class="login-panel"><form class="login-box" onsubmit="login(event)"><h2>مرحبًا بعودتك</h2><p>سجّل الدخول إلى نظام أوربت للاستشارات الهندسية</p><div class="field"><label>البريد الإلكتروني</label><input class="input" id="loginEmail" type="email" placeholder="أدخل البريد الإلكتروني" required></div><div class="field" style="margin-top:14px"><label>كلمة المرور</label><input class="input" id="loginPassword" type="password" placeholder="أدخل كلمة المرور" required></div><button class="btn btn-primary" style="width:100%;margin-top:20px">تسجيل الدخول</button></form></section>
  </div>`;
}
async function login(e){
  e.preventDefault();
  const email=$('#loginEmail').value.trim().toLowerCase(), password=$('#loginPassword').value;
  const btn=e?.target?.querySelector('button'); if(btn){btn.disabled=true;btn.textContent='جاري تسجيل الدخول...'}
  try{
    const remote=await orbitApi('/api/login',{method:'POST',body:JSON.stringify({email,password})});
    if(remote?.ok){
      try{sessionStorage.setItem(ORBIT_TOKEN_KEY,remote.token||'')}catch{}
      if(remote.state){state=normalizeState(sanitizeClientState(remote.state));storeClientState()}
      const remoteUser=remote.user||{};
      const localUser=state.users.find(x=>String(x.email||'').toLowerCase()===email)||remoteUser;
      saveSession({...localUser,serverAuthenticated:true});
      logAudit('تسجيل دخول','الأمان',email);
      currentView='dashboard';saveView(currentView);render();toast('تم تسجيل الدخول من السيرفر بنجاح');orbitSetServerStatus('online','متصل بالسيرفر');return;
    }
  }catch(err){orbitSetServerStatus('offline','السيرفر غير متاح');}
  if(btn){btn.disabled=false;btn.textContent='تسجيل الدخول'}
  return toast('لا يمكن تسجيل الدخول بدون اتصال بالسيرفر في النسخة الآمنة','error');
}
function logout(){try{orbitApi('/api/logout',{method:'POST'}).catch(()=>{})}catch{}logAudit('تسجيل خروج','الأمان',currentUser?.email||'');saveState();saveSession(null);try{sessionStorage.removeItem(VIEW_KEY);sessionStorage.removeItem(ORBIT_TOKEN_KEY)}catch{}currentView='dashboard';render();}
function go(v){currentView=v;saveView(v);sidebarOpen=false;servicesMenuOpen=false;render();}
function toggleServicesMenu(){servicesMenuOpen=!servicesMenuOpen;render();}
function toggleSidebar(){sidebarOpen=!sidebarOpen;render();}
function toggleTheme(){state.settings.theme=state.settings.theme==='dark'?'light':'dark';saveState();render();}

function sectionSearchLabel(){return NAV.find(n=>n[0]===currentView)?.[2]||EXTRA_MODULES[currentView]?.label||'القسم الحالي'}
function sectionHasNativeSearch(){return currentView==='employees'||currentView==='custody'||Boolean(EXTRA_MODULES[currentView])}
function normalizeSearchText(value){return String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f\u064b-\u065f\u0670]/g,'').replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/\s+/g,' ').trim()}
function sectionStatusConfig(route=currentView){
  const generic=EXTRA_MODULES[route];
  if(generic?.statuses)return {route,stateKey:generic.stateKey,statuses:generic.statuses,employeeField:generic.employeeField,label:generic.label};
  const configs={
    employees:{stateKey:'employees',label:'الموظفين',statuses:[['active','نشط'],['inactive','غير نشط']]},
    documents:{stateKey:'documents',label:'المستندات والعقود',statuses:[['active','ساري'],['reviewed','تمت المراجعة'],['expired','منتهي'],['archived','مؤرشف']]},
    attendance:{stateKey:'attendance',label:'الحضور',statuses:[['present','حاضر'],['late','متأخر'],['absent','غائب']]},
    leaves:{stateKey:'leaves',label:'الإجازات',statuses:[['pending','قيد المراجعة'],['reviewed','تمت المراجعة'],['approved','معتمد'],['rejected','مرفوض']],employeeField:'employeeId'},
    missions:{stateKey:'missions',label:'المأموريات',statuses:[['pending','قيد المراجعة'],['reviewed','تمت المراجعة'],['approved','معتمد'],['rejected','مرفوض']],employeeField:'employeeId'},
    expenses:{stateKey:'expenses',label:'مصروفات الشركة',statuses:[['pending','قيد المراجعة'],['reviewed','تمت المراجعة'],['approved','معتمد'],['rejected','مرفوض']]},
    adjustments:{stateKey:'adjustments',label:'الخصومات والمكافآت',statuses:[['pending','قيد المراجعة'],['reviewed','تمت المراجعة'],['approved','معتمد'],['rejected','مرفوض']],employeeField:'employeeId'},
    custody:{stateKey:'custodies',label:'العُهد',statuses:[['assigned','مفتوحة / نشطة'],['reviewed','قيد المراجعة'],['returned','تمت التسوية / الرد'],['damaged','تالف'],['lost','مفقود']],employeeField:'employeeId'},
    payroll:{stateKey:'payroll',label:'الرواتب',statuses:[['draft','مسودة'],['reviewed','تمت المراجعة'],['approved','معتمد'],['paid','تم الصرف'],['locked','مغلق']],employeeField:'employeeId'}
  };
  return configs[route]||null
}
function canEditCurrentSectionStatus(){const cfg=sectionStatusConfig();if(!cfg)return false;if(currentView==='payroll')return canOperatePayroll();return canManage()}
function renderSectionTools(){
  return `<div class="section-tools no-print"><div class="section-tools-title"><span>⚙</span><div><strong>أدوات ${escapeHTML(sectionSearchLabel())}</strong><small>تصفية بالتاريخ، تصدير التقرير، وتحديث الحالات من مكان واحد</small></div></div><div class="section-tools-controls"><div class="section-date-field"><label>من تاريخ</label><input class="input" id="sectionDateFrom" type="date" onchange="filterCurrentSection(document.getElementById('sectionGlobalSearch')?.value||'')"></div><div class="section-date-field"><label>إلى تاريخ</label><input class="input" id="sectionDateTo" type="date" onchange="filterCurrentSection(document.getElementById('sectionGlobalSearch')?.value||'')"></div><button class="btn btn-secondary" type="button" onclick="clearSectionDateFilter()">مسح التاريخ</button>${canEditCurrentSectionStatus()?'<button class="btn btn-secondary" type="button" onclick="openUniversalStatusEditor()">↻ تعديل حالة</button>':''}<button class="btn btn-primary section-export-pdf" type="button" onclick="exportCurrentSectionPDF()">⇩ تصدير PDF</button></div></div>`;
}
function renderSectionSearchBar(){
  if(sectionHasNativeSearch())return '';
  return `<div class="section-search-bar no-print"><div class="section-search-copy"><span class="section-search-icon">⌕</span><div><strong>بحث سريع في ${escapeHTML(sectionSearchLabel())}</strong><small>ابحث داخل السجلات والبطاقات الظاهرة في هذا القسم</small></div></div><div class="section-search-control"><input class="input" id="sectionGlobalSearch" placeholder="اكتب كلمة البحث..." oninput="filterCurrentSection(this.value)"><button class="section-search-clear" type="button" onclick="clearCurrentSectionSearch()" title="مسح البحث">×</button></div><span class="section-search-count" id="sectionSearchCount">—</span></div>`;
}
function renderView(){
  const fixed={dashboard:renderDashboard,services:renderServicesHub,organization:renderOrganization,approvals:renderApprovalCenter,selfservice:renderSelfService,employees:renderEmployees,documents:renderDocuments,attendance:renderAttendance,leaves:renderLeaves,shifts:renderShifts,missions:renderMissions,expenses:renderExpenses,adjustments:renderAdjustments,custody:renderCustody,payroll:renderPayroll,reports:renderReports,audit:renderAuditLog,settings:renderSettings};
  const body=EXTRA_MODULES[currentView]?renderGenericModule(currentView):(fixed[currentView]||renderDashboard)();
  return `${renderSectionTools()}${renderSectionSearchBar()}<div id="sectionSearchScope" data-section-route="${escapeHTML(currentView)}">${body}</div>`;
}
function currentSectionSearchTargets(){
  const scope=$('#sectionSearchScope');if(!scope)return [];
  const selectors=['table tbody tr','[data-section-search-item]','.metric','.shift-card','.service-card','.report-directory-item','.settings-section-card','.branch-card','.expense-category-card','.leave-type-card','.status-row','.type-summary-item','.alert-item'];
  const items=[];selectors.forEach(sel=>$$(sel,scope).forEach(el=>{if(!items.includes(el))items.push(el)}));
  return items.filter(el=>!el.closest('.modal'));
}
function latinDigits(value){return String(value||'').replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d))}
const DATE_MONTHS={يناير:1,فبراير:2,مارس:3,أبريل:4,ابريل:4,مايو:5,يونيو:6,يوليو:7,أغسطس:8,اغسطس:8,سبتمبر:9,أكتوبر:10,اكتوبر:10,نوفمبر:11,ديسمبر:12,january:1,february:2,march:3,april:4,may:5,june:6,july:7,august:8,september:9,october:10,november:11,december:12,jan:1,feb:2,mar:3,apr:4,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
function isoDateValue(y,m,d=1){const yy=Number(y),mm=Number(m),dd=Number(d);if(!yy||mm<1||mm>12||dd<1||dd>31)return '';return `${String(yy).padStart(4,'0')}-${String(mm).padStart(2,'0')}-${String(dd).padStart(2,'0')}`}
function extractDatesFromText(value){
  const text=latinDigits(value),dates=[];let match;
  const add=v=>{if(/^\d{4}-\d{2}-\d{2}$/.test(v)&&!dates.includes(v))dates.push(v)};
  const iso=/\b(20\d{2})[-\/.](\d{1,2})(?:[-\/.](\d{1,2}))?\b/g;while((match=iso.exec(text)))add(isoDateValue(match[1],match[2],match[3]||1));
  const numeric=/\b(\d{1,2})[\/.-](\d{1,2})[\/.-](20\d{2})\b/g;while((match=numeric.exec(text)))add(isoDateValue(match[3],match[2],match[1]));
  const named=new RegExp(`\\b(\\d{1,2})\\s+(${Object.keys(DATE_MONTHS).join('|')})\\s+(20\\d{2})\\b`,'gi');while((match=named.exec(text)))add(isoDateValue(match[3],DATE_MONTHS[String(match[2]).toLowerCase()]||DATE_MONTHS[match[2]],match[1]));
  return dates
}
function elementDates(el){const explicit=[el.dataset.date,el.dataset.from,el.dataset.to,el.dataset.month].filter(Boolean).flatMap(extractDatesFromText),textDates=extractDatesFromText(el.textContent||'');return [...new Set([...explicit,...textDates])].sort()}
function elementMatchesDateRange(el,from,to){if(!from&&!to)return true;const dates=elementDates(el);if(!dates.length)return true;const min=dates[0],max=dates[dates.length-1];return(!from||max>=from)&&(!to||min<=to)}
function filterCurrentSection(value=''){
  const q=normalizeSearchText(value),from=$('#sectionDateFrom')?.value||'',to=$('#sectionDateTo')?.value||'',targets=currentSectionSearchTargets();let visible=0;
  targets.forEach(el=>{const text=normalizeSearchText(`${el.dataset.search||''} ${el.textContent||''}`),show=(!q||text.includes(q))&&elementMatchesDateRange(el,from,to);el.classList.toggle('section-search-hidden',!show);if(show)visible++});
  $$('.service-group-card',$('#sectionSearchScope')).forEach(group=>{const cards=$$('.service-card',group);if(cards.length)group.classList.toggle('section-search-hidden',cards.every(card=>card.classList.contains('section-search-hidden')))});
  const count=$('#sectionSearchCount');if(count)count.textContent=targets.length?`${visible} نتيجة`:(q||from||to?'لا توجد عناصر':'جاهز للبحث');
  if(currentView==='custody')syncCustodyBranchVisibility();if(currentView==='payroll')syncPayrollBranchVisibility();
}
function clearCurrentSectionSearch(){const input=$('#sectionGlobalSearch');if(input)input.value='';filterCurrentSection('');input?.focus()}
function clearSectionDateFilter(){const a=$('#sectionDateFrom'),b=$('#sectionDateTo');if(a)a.value='';if(b)b.value='';filterCurrentSection($('#sectionGlobalSearch')?.value||'')}
function refreshSectionSearchCount(){if($('#sectionGlobalSearch')||$('#sectionDateFrom'))filterCurrentSection($('#sectionGlobalSearch')?.value||'')}
function statusRecordLabel(cfg,r){const employee=cfg.employeeField?emp(r[cfg.employeeField]):null;return [r.title,r.item,r.name,r.code,r.number,r.type,r.category,employee?.name,r.month,r.date,r.from].filter(Boolean).join(' — ')||r.id}
function universalStatusRecords(cfg){let list=[...(state[cfg.stateKey]||[])];if(cfg.employeeField){const ids=visibleEmployees().map(e=>e.id);list=list.filter(r=>ids.includes(r[cfg.employeeField]))}return list.sort((a,b)=>String(b.updatedAt||b.date||b.from||b.month||'').localeCompare(String(a.updatedAt||a.date||a.from||a.month||'')))}
function openUniversalStatusEditor(){const cfg=sectionStatusConfig();if(!cfg||!canEditCurrentSectionStatus())return toast('لا توجد حالات قابلة للتعديل في هذا القسم','error');const records=universalStatusRecords(cfg);if(!records.length)return toast('لا توجد سجلات لتعديل حالتها','error');openModal(`تعديل حالة — ${cfg.label}`,`<form id="universalStatusForm" class="form-grid"><div class="field full"><label>اختر السجل</label><select class="select" name="recordId" onchange="refreshUniversalStatusHint()">${records.map(r=>`<option value="${escapeHTML(r.id)}" data-status="${escapeHTML(r.status||'')}">${escapeHTML(statusRecordLabel(cfg,r))} — ${escapeHTML(statusText(r.status||''))}</option>`).join('')}</select></div><div class="field"><label>الحالة الجديدة</label><select class="select" name="status">${cfg.statuses.map(([v,l])=>`<option value="${escapeHTML(v)}">${escapeHTML(l)}</option>`).join('')}</select></div><div class="field"><label>الحالة الحالية</label><div class="input readonly-input" id="universalStatusCurrent">—</div></div><div class="field full"><div class="notice">يمكنك الانتقال إلى أي حالة، بما في ذلك الرجوع من «معتمد» إلى «تمت المراجعة». يتم تسجيل التغيير في سجل النظام.</div></div></form>`,saveUniversalStatus,'حفظ الحالة');refreshUniversalStatusHint()}
function refreshUniversalStatusHint(){const form=$('#universalStatusForm'),opt=form?.elements.recordId?.selectedOptions?.[0],current=opt?.dataset.status||'';if($('#universalStatusCurrent'))$('#universalStatusCurrent').textContent=statusText(current);if(form?.elements.status&&current)form.elements.status.value=current}
function saveUniversalStatus(){const cfg=sectionStatusConfig(),form=$('#universalStatusForm');if(!cfg||!form)return;const id=form.elements.recordId.value,status=form.elements.status.value,record=(state[cfg.stateKey]||[]).find(r=>r.id===id);if(!record)return toast('السجل غير موجود','error');if(cfg.stateKey==='employees'&&record.id===currentUser?.employeeId&&status==='inactive')return toast('لا يمكن إيقاف الموظف المستخدم حاليًا','error');const old=record.status||'';record.status=status;record.updatedAt=new Date().toISOString();record.statusUpdatedAt=record.updatedAt;record.statusUpdatedBy=currentUser.id;if(cfg.stateKey==='attendance'){record.status=status;if(status==='absent'){record.checkIn=null;record.checkOut=null;record.lateMinutes=0;record.overtimeMinutes=0}}if(cfg.stateKey==='payroll'){record.status=status}logAudit('تعديل حالة','الحالات',`${cfg.label}: ${statusRecordLabel(cfg,record)} — ${statusText(old)} ← ${statusText(status)}`);saveState();closeModal();render();toast('تم تحديث الحالة بنجاح')}
function afterRender(){if(currentView==='attendance')filterAttendanceRows();refreshSectionSearchCount();enhanceTablesWithSelection();if(currentView==='settings'&&settingsActiveGroup==='permissions'){updatePermissionGroupCheckCounter();updatePermissionGroupAssignCounter();}orbitAfterRenderEnhancements();applyLanguage();}

function renderDashboard(){
  const list=visibleEmployees(),ids=list.map(e=>e.id),active=list.filter(e=>e.status==='active'),inactive=list.filter(e=>e.status!=='active');
  const today=state.attendance.filter(a=>a.date===todayISO()&&ids.includes(a.employeeId)),present=today.filter(a=>['present','late'].includes(a.status)).length,late=today.filter(a=>a.status==='late').length;
  const pendingLeaves=state.leaves.filter(l=>l.status==='pending'&&ids.includes(l.employeeId)).length,pendingExpenses=state.expenses.filter(x=>x.status==='pending').length,pendingAdjustments=state.adjustments.filter(x=>x.status==='pending'&&ids.includes(x.employeeId)).length;
  const alerts=hrAlerts(ids),currentPayroll=state.payroll.filter(p=>p.month===monthISO()&&ids.includes(p.employeeId)),netPayroll=currentPayroll.reduce((s,p)=>s+Number(p.net||0),0),approvedExpenses=state.expenses.filter(x=>x.status==='approved'&&String(x.date||'').startsWith(monthISO())).reduce((s,x)=>s+Number(x.amount||0),0),custodyBalance=state.custodies.filter(x=>x.custodyType==='financial').reduce((s,x)=>s+custodyRemaining(x),0);
  const days=[-6,-5,-4,-3,-2,-1,0].map(offset=>{const d=new Date();d.setDate(d.getDate()+offset);const iso=d.toISOString().slice(0,10);return {label:new Intl.DateTimeFormat(currentLocale(),{weekday:'short'}).format(d),value:state.attendance.filter(a=>a.date===iso&&ids.includes(a.employeeId)).length}}),departments=[...new Set(list.map(e=>e.department))],branches=getBranches().map(b=>({name:b,count:active.filter(e=>e.branch===b).length}));
  return `<div class="dashboard-hero"><div><span class="page-eyebrow">Orbit HR Analytics</span><h2>أهلًا ${escapeHTML(currentUser.name.split(' ')[0])} 👋</h2><p>لوحة تشغيلية موحدة لمتابعة الموارد البشرية والمالية والحضور والطلبات.</p></div><div class="dashboard-hero-actions"><button class="btn btn-light" onclick="go('reports')">▥ التقارير</button><button class="btn btn-primary" onclick="go('attendance')">◷ الحضور</button></div></div><div class="grid grid-4 dashboard-metrics">${metric('👥',active.length,'الموظفون النشطون',`${inactive.length} غير نشط`)}${metric('✓',present,'الحاضرون اليوم',`${Math.round((present/Math.max(active.length,1))*100)}% من النشطين`)}${metric('⏱',late,'حالات التأخير','تحتاج متابعة')}${metric('⌛',pendingLeaves+pendingExpenses+pendingAdjustments,'طلبات معلقة',`${pendingLeaves} إجازات · ${pendingExpenses} مصروفات`)}</div><div class="grid grid-3" style="margin-top:18px">${metric('💳',money(netPayroll,state.settings.currency),'صافي رواتب الشهر',`${currentPayroll.length} مسيرات`)}${metric('▣',money(approvedExpenses,state.settings.currency),'مصروفات الشهر المعتمدة','مصروفات الشركة')}${metric('▦',money(custodyBalance,state.settings.currency),'أرصدة العهد المالية','الرصيد المتبقي')}</div><div class="grid grid-2" style="margin-top:18px"><div class="card"><div class="card-title"><h3>الحضور خلال 7 أيام</h3><button class="link-btn" onclick="go('reports')">عرض التقرير</button></div><div class="chart-bars">${days.map(d=>`<div class="bar-wrap"><div class="bar" style="height:${Math.max(4,d.value/Math.max(active.length,1)*180)}px"><span>${d.value}</span></div><div class="bar-label">${d.label}</div></div>`).join('')}</div></div><div class="card"><div class="card-title"><h3>توزيع الموظفين حسب الفرع</h3></div><div class="kpi-list">${branches.map(b=>{const pct=Math.round(b.count/Math.max(active.length,1)*100);return `<div class="kpi-row"><span>${escapeHTML(b.name)}</span><div class="progress"><span style="width:${pct}%"></span></div><strong>${b.count}</strong></div>`}).join('')}</div></div></div><div class="grid grid-2" style="margin-top:18px"><div class="card"><div class="card-title"><h3>توزيع الأقسام</h3></div><div class="kpi-list">${departments.map(d=>{const c=active.filter(e=>e.department===d).length,p=Math.round(c/Math.max(active.length,1)*100);return `<div class="kpi-row"><span>${escapeHTML(d)}</span><div class="progress"><span style="width:${p}%"></span></div><strong>${c}</strong></div>`}).join('')}</div></div><div class="card"><div class="card-title"><h3>حالة دورة الرواتب</h3><button class="link-btn" onclick="go('payroll')">فتح الرواتب</button></div><div class="status-panel">${['draft','reviewed','approved','paid','locked'].map(st=>`<div class="status-row"><span>${statusText(st)}</span><strong>${currentPayroll.filter(p=>p.status===st).length}</strong></div>`).join('')}</div></div></div>${alerts.length?`<div class="card alert-center" style="margin-top:18px"><div class="card-title"><div><h3>تنبيهات الموارد البشرية</h3><div class="small muted">عقود ومستندات وفترات تجربة تقترب من الانتهاء</div></div><button class="link-btn" onclick="go('documents')">فتح المستندات</button></div><div class="alert-list">${alerts.slice(0,6).map(a=>`<article class="alert-item ${a.level}"><span>${a.icon}</span><div><strong>${escapeHTML(a.title)}</strong><p>${escapeHTML(a.details)}</p></div><b>${a.days} يوم</b></article>`).join('')}</div></div>`:''}<div class="card" style="margin-top:18px"><div class="card-title"><h3>حضور اليوم</h3><button class="link-btn" onclick="go('attendance')">عرض الكل</button></div>${attendanceTable(today.slice(0,8))}</div>`;
}
function metric(icon,value,title,sub){return `<div class="card metric"><div><p>${title}</p><h3>${value}</h3><div class="trend">${sub}</div></div><div class="metric-icon">${icon}</div></div>`}

function renderEmployees(){
  const rows=state.employees;
  return `<div class="page-head"><div><h2>دليل الموظفين</h2><p>إدارة بيانات الموظفين وحسابات الدخول والصور الشخصية والهيكل الإداري.</p></div>${canAdmin()?'<button class="btn btn-primary" onclick="employeeModal()">＋ موظف جديد</button>':''}</div>
  <div class="card"><div class="toolbar"><input id="employeeSearch" class="input" placeholder="بحث بالاسم أو الكود أو القسم" oninput="filterEmployeeRows()"><select id="employeeDept" class="select" onchange="filterEmployeeRows()"><option value="">كل الأقسام</option>${getDepartments().map(d=>`<option>${escapeHTML(d)}</option>`).join('')}</select><select id="employeeBranch" class="select" onchange="filterEmployeeRows()"><option value="">كل الفروع</option>${getBranches().map(b=>`<option>${escapeHTML(b)}</option>`).join('')}</select><select id="employeeStatus" class="select" onchange="filterEmployeeRows()"><option value="">كل الحالات</option><option value="active">نشط</option><option value="inactive">غير نشط</option></select><button class="btn btn-secondary" onclick="exportEmployees()">⇩ تصدير CSV</button></div>
  <div class="table-wrap"><table class="table" id="employeesTable"><thead><tr><th>الموظف</th><th>الكود</th><th>القسم / الوظيفة</th><th>الفرع / العملة</th><th>حساب الدخول</th><th>الوردية</th><th>الراتب</th><th>الحالة</th><th>إجراءات</th></tr></thead><tbody>${rows.map(e=>employeeRow(e)).join('')}</tbody></table></div></div>`;
}
function employeeRow(e){
  const account=employeeAccount(e.id);
  return `<tr data-record-id="${e.id}" data-search="${escapeHTML((e.name+' '+e.code+' '+e.department+' '+e.jobTitle+' '+e.branch).toLowerCase())}" data-dept="${escapeHTML(e.department)}" data-branch="${escapeHTML(e.branch)}" data-status="${escapeHTML(e.status||'active')}"><td><div class="employee-cell">${avatarHTML(e)}<div><strong>${escapeHTML(e.name)}</strong><div class="small muted">${escapeHTML(e.email)}</div></div></div></td><td>${escapeHTML(e.code)}</td><td>${escapeHTML(e.department)}<div class="small muted">${escapeHTML(e.jobTitle)}</div></td><td>${escapeHTML(e.branch)}<div class="small muted">${branchCurrencyLabel(e.branch)}</div></td><td>${account?`<span class="badge ${account.active?'badge-success':'badge-neutral'}">${account.active?'مفعّل':'موقوف'}</span><div class="small muted" style="margin-top:5px">${accountPermissionLabel(account)}</div>`:'<span class="badge badge-neutral">بدون حساب</span>'}</td><td>${escapeHTML(shift(e.shiftId)?.name||'-')}</td><td>${money(e.salary,getBranchCurrency(e.branch))}</td><td>${statusBadge(e.status)}</td><td><div class="actions"><button class="btn btn-secondary btn-sm" onclick="viewEmployee('${e.id}')">عرض</button>${canAdmin()?`<button class="btn btn-secondary btn-sm" onclick="employeeModal('${e.id}')">تعديل</button><button class="btn btn-danger btn-sm" onclick="deleteEmployee('${e.id}')">حذف</button>`:''}</div></td></tr>`;
}
function filterEmployeeRows(){const q=$('#employeeSearch').value.trim().toLowerCase(),d=$('#employeeDept').value,b=$('#employeeBranch').value,st=$('#employeeStatus')?.value||'';$$('#employeesTable tbody tr').forEach(r=>r.style.display=(!q||r.dataset.search.includes(q))&&(!d||r.dataset.dept===d)&&(!b||r.dataset.branch===b)&&(!st||r.dataset.status===st)?'':'none')}
function employeeModal(id=''){
  const departments=getDepartments(),branches=getBranches();
  const e=id?emp(id):{code:`EMP-${String(state.employees.length+1).padStart(3,'0')}`,name:'',email:'',phone:'',department:departments[0]||'',jobTitle:'',branch:branches[0]||'',company:state.settings.company,hireDate:todayISO(),salary:0,shiftId:state.shifts[0]?.id||'',managerId:'',status:'active',photo:'',nationalId:'',birthDate:'',gender:'',address:'',emergencyName:'',emergencyPhone:'',bankName:'',bankAccount:'',insuranceNumber:'',taxNumber:'',contractType:'دائم',contractStart:todayISO(),contractEnd:'',probationEnd:'',insuranceDeduction:0,taxDeduction:0};
  const account=id?employeeAccount(id):null;
  const hasAccount=Boolean(account)||!id;
  pendingEmployeePhoto=e.photo||'';
  openModal(id?'تعديل بيانات موظف':'إضافة موظف جديد',`<form id="employeeForm" class="form-grid">
    <div class="field full employee-photo-editor">
      <div id="employeePhotoPreview" class="photo-preview">${avatarHTML(e,96)}</div>
      <div class="photo-controls"><label>الصورة الشخصية</label><input class="input" type="file" accept="image/*" onchange="handleEmployeePhoto(this)"><div class="help">تُضغط الصورة تلقائيًا وتُحفظ داخل النسخة التجريبية على هذا الجهاز.</div><button class="btn btn-secondary btn-sm" type="button" onclick="removeEmployeePhoto()">إزالة الصورة</button></div>
    </div>
    <div class="field"><label>الاسم الكامل</label><input class="input" name="name" type="text" value="${escapeHTML(e.name)}" oninput="updateEmployeePhotoFallback(this.value)" required></div>
    ${field('كود الموظف','code',e.code,'text',true)}<div class="field"><label>البريد الوظيفي</label><input class="input" name="email" type="email" value="${escapeHTML(e.email)}" oninput="syncEmployeeLoginEmail(this.value)" required></div>${field('رقم الهاتف','phone',e.phone,'tel')}<div class="field"><label>القسم</label><select class="select" name="department" required><option value="">اختر القسم</option>${departments.map(d=>`<option value="${escapeHTML(d)}" ${d===e.department?'selected':''}>${escapeHTML(d)}</option>`).join('')}</select><div class="help">إدارة الأقسام متاحة من إعدادات النظام.</div></div>${field('المسمى الوظيفي','jobTitle',e.jobTitle,'text',true)}<div class="field"><label>الفرع</label><select class="select" name="branch" required onchange="updateBranchCurrencyHint(this.value)"><option value="">اختر الفرع</option>${branches.map(b=>`<option value="${escapeHTML(b)}" ${b===e.branch?'selected':''}>${escapeHTML(b)} — ${branchCurrencyLabel(b)}</option>`).join('')}</select><div class="help" id="branchCurrencyHint">عملة الفرع المحدد: ${branchCurrencyLabel(e.branch)}</div></div>${field('تاريخ التعيين','hireDate',e.hireDate,'date',true)}${field('الراتب الأساسي','salary',e.salary,'number',true)}
    <div class="field"><label>الوردية</label><select class="select" name="shiftId">${state.shifts.map(s=>`<option value="${s.id}" ${s.id===e.shiftId?'selected':''}>${escapeHTML(s.name)}</option>`).join('')}</select></div>
    <div class="field"><label>المدير المباشر</label><select class="select" name="managerId"><option value="">بدون</option>${state.employees.filter(x=>x.id!==id).map(x=>`<option value="${x.id}" ${x.id===e.managerId?'selected':''}>${escapeHTML(x.name)}</option>`).join('')}</select></div>
    <div class="field"><label>حالة الموظف</label><select class="select" name="status"><option value="active" ${e.status==='active'?'selected':''}>نشط</option><option value="inactive" ${e.status==='inactive'?'selected':''}>غير نشط</option></select></div>
    <div class="field full form-section-title"><strong>البيانات الشخصية والطوارئ</strong></div>
    ${field('الرقم القومي / الهوية','nationalId',e.nationalId,'text')}${field('تاريخ الميلاد','birthDate',e.birthDate,'date')}<div class="field"><label>النوع</label><select class="select" name="gender"><option value="">غير محدد</option><option value="male" ${e.gender==='male'?'selected':''}>ذكر</option><option value="female" ${e.gender==='female'?'selected':''}>أنثى</option></select></div>${field('العنوان','address',e.address,'text')}${field('اسم شخص للطوارئ','emergencyName',e.emergencyName,'text')}${field('هاتف الطوارئ','emergencyPhone',e.emergencyPhone,'tel')}
    <div class="field full form-section-title"><strong>العقد والبنك والتأمينات</strong></div>
    <div class="field"><label>نوع العقد</label><select class="select" name="contractType"><option value="دائم" ${e.contractType==='دائم'?'selected':''}>دائم</option><option value="محدد المدة" ${e.contractType==='محدد المدة'?'selected':''}>محدد المدة</option><option value="جزئي" ${e.contractType==='جزئي'?'selected':''}>دوام جزئي</option><option value="استشاري" ${e.contractType==='استشاري'?'selected':''}>استشاري</option><option value="تدريب" ${e.contractType==='تدريب'?'selected':''}>تدريب</option></select></div>${field('بداية العقد','contractStart',e.contractStart,'date')}${field('نهاية العقد','contractEnd',e.contractEnd,'date')}${field('نهاية فترة التجربة','probationEnd',e.probationEnd,'date')}${field('اسم البنك','bankName',e.bankName,'text')}${field('رقم الحساب / IBAN','bankAccount',e.bankAccount,'text')}${field('الرقم التأميني','insuranceNumber',e.insuranceNumber,'text')}${field('الرقم الضريبي','taxNumber',e.taxNumber,'text')}${field('خصم التأمين الشهري','insuranceDeduction',e.insuranceDeduction,'number')}${field('خصم الضريبة الشهري','taxDeduction',e.taxDeduction,'number')}
    <div class="field full account-box">
      <label class="check-row"><input type="checkbox" name="createAccount" ${hasAccount?'checked':''} onchange="toggleAccountFields()"><span><strong>إنشاء حساب دخول للموظف</strong><small>يتمكن الموظف من الدخول بالبريد وكلمة المرور حسب الصلاحية المحددة.</small></span></label>
      <div id="accountFields" class="form-grid inner-grid">
        <div class="field"><label>بريد تسجيل الدخول</label><input class="input" name="accountEmail" type="email" value="${escapeHTML(account?.email||e.email)}" data-auto="${account?'false':'true'}" oninput="this.dataset.auto='false'" placeholder="employee@company.com"></div>
        <div class="field"><label>${account?'كلمة مرور جديدة (اختياري)':'كلمة المرور'}</label><input class="input" name="accountPassword" type="password" placeholder="${account?'اتركها فارغة للإبقاء على الحالية':'6 أحرف على الأقل'}" autocomplete="new-password"></div>
        <div class="field"><label>الصلاحية</label><select class="select" name="accountRole">${roleOptions(account?.role||'employee')}</select><div class="help">يمكن تعديل صلاحيات أدوار HR والمالية من الإعدادات.</div></div>
        <div class="field"><label>حالة الحساب</label><select class="select" name="accountActive"><option value="true" ${account?.active!==false?'selected':''}>مفعّل</option><option value="false" ${account?.active===false?'selected':''}>موقوف</option></select></div>
      </div>
      ${account?'<div class="help danger-text">إلغاء التحديد سيحذف حساب الدخول المرتبط فقط، ولن يحذف ملف الموظف.</div>':'<div class="help">يمكن ترك الخيار غير محدد لإضافة الموظف دون منحه دخولًا للبرنامج.</div>'}
    </div>
  </form>`,()=>saveEmployee(id));
  toggleAccountFields();
}
function field(label,name,value,type='text',required=false){const step=type==='number'?'step="any"':'';return `<div class="field"><label>${label}</label><input class="input" name="${name}" type="${type}" ${step} value="${escapeHTML(value)}" ${required?'required':''}></div>`}
function syncEmployeeLoginEmail(email){
  const login=$('#employeeForm [name="accountEmail"]');
  if(login?.dataset.auto==='true')login.value=email;
}
function updateBranchCurrencyHint(branch){const el=$('#branchCurrencyHint');if(el)el.textContent=branch?`عملة الفرع المحدد: ${branchCurrencyLabel(branch)}`:'اختر الفرع لعرض العملة'}
function toggleAccountFields(){
  const enabled=$('#employeeForm [name="createAccount"]')?.checked;
  $$('#accountFields input,#accountFields select').forEach(el=>el.disabled=!enabled);
  $('#accountFields')?.classList.toggle('disabled',!enabled);
}
function updateEmployeePhotoFallback(name){
  if(pendingEmployeePhoto)return;
  const box=$('#employeePhotoPreview');
  if(box)box.innerHTML=avatarHTML({name:name||'موظف'},96);
}
function removeEmployeePhoto(){
  pendingEmployeePhoto='';
  const name=$('#employeeForm [name="name"]')?.value||'موظف';
  const box=$('#employeePhotoPreview');
  if(box)box.innerHTML=avatarHTML({name},96);
}
async function handleEmployeePhoto(input){
  const file=input.files?.[0];
  if(!file)return;
  if(!file.type.startsWith('image/')){input.value='';return toast('اختر ملف صورة صالحًا','error')}
  try{
    pendingEmployeePhoto=await resizeEmployeePhoto(file);
    const name=$('#employeeForm [name="name"]')?.value||'موظف';
    const box=$('#employeePhotoPreview');
    if(box)box.innerHTML=avatarHTML({name,photo:pendingEmployeePhoto},96);
    toast('تم تجهيز صورة الموظف');
  }catch{
    input.value='';toast('تعذر قراءة الصورة، جرّب صورة أخرى','error');
  }
}
function resizeEmployeePhoto(file,maxSize=480){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onerror=reject;
    reader.onload=()=>{
      const image=new Image();
      image.onerror=reject;
      image.onload=()=>{
        const scale=Math.min(1,maxSize/image.width,maxSize/image.height);
        const width=Math.max(1,Math.round(image.width*scale)),height=Math.max(1,Math.round(image.height*scale));
        const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
        const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0,width,height);
        resolve(canvas.toDataURL('image/jpeg',.82));
      };
      image.src=reader.result;
    };
    reader.readAsDataURL(file);
  });
}
function saveEmployee(id){
  const form=$('#employeeForm');
  const value=name=>form.elements[name]?.value?.trim?.()??'';
  const employeeData={
    name:value('name'),code:value('code'),email:value('email').toLowerCase(),phone:value('phone'),department:value('department'),jobTitle:value('jobTitle'),branch:value('branch'),hireDate:value('hireDate'),salary:Number(value('salary')),shiftId:value('shiftId'),managerId:value('managerId'),status:value('status'),photo:pendingEmployeePhoto,nationalId:value('nationalId'),birthDate:value('birthDate'),gender:value('gender'),address:value('address'),emergencyName:value('emergencyName'),emergencyPhone:value('emergencyPhone'),bankName:value('bankName'),bankAccount:value('bankAccount'),insuranceNumber:value('insuranceNumber'),taxNumber:value('taxNumber'),contractType:value('contractType'),contractStart:value('contractStart'),contractEnd:value('contractEnd'),probationEnd:value('probationEnd'),insuranceDeduction:Math.max(0,Number(value('insuranceDeduction'))),taxDeduction:Math.max(0,Number(value('taxDeduction')))
  };
  if(!employeeData.name||!employeeData.code||!employeeData.email||!employeeData.department||!employeeData.jobTitle||!employeeData.branch)return toast('أكمل الحقول المطلوبة','error');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(employeeData.email))return toast('البريد الوظيفي غير صحيح','error');
  if(Number(employeeData.salary)<0||Number(employeeData.insuranceDeduction)<0||Number(employeeData.taxDeduction)<0)return toast('الراتب والخصومات الثابتة لا يمكن أن تكون سالبة','error');
  if(employeeData.status==='active'&&!employeeData.shiftId)return toast('الموظف النشط يجب أن يكون مربوطًا بوردية','error');
  if(employeeData.shiftId&&!shift(employeeData.shiftId))return toast('الوردية المختارة غير موجودة','error');
  if(employeeData.contractEnd&&employeeData.contractStart&&employeeData.contractEnd<employeeData.contractStart)return toast('تاريخ نهاية العقد لا يمكن أن يسبق بداية العقد','error');
  if(employeeData.probationEnd&&employeeData.contractStart&&employeeData.probationEnd<employeeData.contractStart)return toast('نهاية فترة التجربة لا يمكن أن تسبق بداية العقد','error');
  if(state.employees.some(e=>e.id!==id&&e.code.toLowerCase()===employeeData.code.toLowerCase()))return toast('كود الموظف مستخدم بالفعل','error');
  if(state.employees.some(e=>e.id!==id&&e.email.toLowerCase()===employeeData.email))return toast('البريد الوظيفي مستخدم لموظف آخر','error');

  const employeeId=id||uid('e');
  const wantsAccount=form.elements.createAccount.checked;
  const existingAccount=id?employeeAccount(id):null;
  const accountEmail=value('accountEmail').toLowerCase();
  const accountPassword=form.elements.accountPassword?.value||'';
  if(wantsAccount){
    if(!accountEmail)return toast('أدخل بريد تسجيل الدخول','error');
    if(!existingAccount&&accountPassword.length<6)return toast('كلمة المرور يجب أن تكون 6 أحرف على الأقل','error');
    if(accountPassword&&accountPassword.length<6)return toast('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل','error');
    if(state.users.some(u=>u.id!==existingAccount?.id&&u.email.toLowerCase()===accountEmail))return toast('بريد تسجيل الدخول مستخدم بالفعل','error');
  }else if(existingAccount?.id===currentUser?.id){
    return toast('لا يمكن حذف حساب الدخول المستخدم حاليًا','error');
  }

  if(wantsAccount&&state.users.some(u=>u.id!==existingAccount?.id&&u.employeeId===employeeId))return toast('هذا الموظف مرتبط بحساب دخول آخر بالفعل','error');
  if(id)Object.assign(emp(id),employeeData);
  else state.employees.push({id:employeeId,company:state.settings.company,...employeeData});

  if(wantsAccount){
    const accountData={employeeId,name:employeeData.name,email:accountEmail,role:value('accountRole'),active:value('accountActive')==='true'};
    if(existingAccount){
      const roleChanged=existingAccount.role!==accountData.role;
      Object.assign(existingAccount,accountData);
      if(roleChanged)delete existingAccount.permissions;
      if(accountPassword)existingAccount.password=accountPassword;
    }else{
      state.users.push({id:uid('u'),...accountData,password:accountPassword});
    }
  }else if(existingAccount){
    state.users=state.users.filter(u=>u.id!==existingAccount.id);
  }

  const signedInAccount=state.users.find(u=>u.id===currentUser?.id);
  if(signedInAccount)saveSession({...signedInAccount});
  logAudit(id?'تعديل موظف':'إضافة موظف','الموظفون',`${employeeData.name} — ${employeeData.code}`);saveState();closeModal();render();toast(wantsAccount?'تم حفظ الموظف وحساب الدخول':'تم حفظ بيانات الموظف');
}
function deleteEmployee(id){
  if(currentUser?.employeeId===id)return toast('لا يمكن حذف ملف المستخدم المسجل حاليًا','error');
  if(!confirm('هل تريد حذف الموظف وحساب الدخول المرتبط به؟'))return;
  state.employees=state.employees.filter(e=>e.id!==id);
  state.users=state.users.filter(u=>u.employeeId!==id);state.documents=state.documents.filter(x=>x.employeeId!==id);logAudit('حذف موظف','الموظفون',id);
  saveState();render();toast('تم حذف الموظف وحساب الدخول');
}
function viewEmployee(id){
  const e=emp(id),account=employeeAccount(id);
  openModal('ملف الموظف',`<div class="employee-cell" style="margin-bottom:20px">${avatarHTML(e,72)}<div><h2 style="margin:0 0 5px">${escapeHTML(e.name)}</h2><div class="muted">${escapeHTML(e.jobTitle)} — ${escapeHTML(e.department)}</div></div></div><div class="grid grid-2">${infoCard('كود الموظف',e.code)}${infoCard('البريد الوظيفي',e.email)}${infoCard('الهاتف',e.phone)}${infoCard('الفرع',e.branch)}${infoCard('عملة الفرع',branchCurrencyLabel(e.branch))}${infoCard('تاريخ التعيين',fmtDate(e.hireDate))}${infoCard('المدير',emp(e.managerId)?.name||'-')}${infoCard('الوردية',shift(e.shiftId)?.name||'-')}${infoCard('الراتب',money(e.salary,getBranchCurrency(e.branch)))}${infoCard('حساب الدخول',account?account.email:'غير موجود')}${infoCard('الصلاحية',account?`${accountPermissionLabel(account)} — ${account.active?'مفعّل':'موقوف'}`:'-')}${infoCard('الرقم القومي / الهوية',e.nationalId||'-')}${infoCard('تاريخ الميلاد',e.birthDate?fmtDate(e.birthDate):'-')}${infoCard('العنوان',e.address||'-')}${infoCard('هاتف الطوارئ',e.emergencyPhone||'-')}${infoCard('نوع العقد',e.contractType||'-')}${infoCard('مدة العقد',`${e.contractStart?fmtDate(e.contractStart):'-'} — ${e.contractEnd?fmtDate(e.contractEnd):'غير محدد'}`)}${infoCard('نهاية التجربة',e.probationEnd?fmtDate(e.probationEnd):'-')}${infoCard('البنك / الحساب',`${e.bankName||'-'} — ${e.bankAccount||'-'}`)}${infoCard('الرقم التأميني',e.insuranceNumber||'-')}${infoCard('الرقم الضريبي',e.taxNumber||'-')}${infoCard('خصم التأمين الشهري',money(e.insuranceDeduction||0,getBranchCurrency(e.branch)))}${infoCard('خصم الضريبة الشهري',money(e.taxDeduction||0,getBranchCurrency(e.branch)))}</div>`,null,'إغلاق');
}
function infoCard(a,b){return `<div class="card" style="box-shadow:none;padding:14px"><div class="small muted">${a}</div><strong>${escapeHTML(b)}</strong></div>`}
function exportEmployees(){downloadCSV('employees.csv',['الكود','الاسم','البريد','الهاتف','القسم','الوظيفة','الفرع','الهوية','تاريخ الميلاد','نوع العقد','بداية العقد','نهاية العقد','البنك','رقم الحساب','الرقم التأميني','الرقم الضريبي','خصم التأمين','خصم الضريبة','كود العملة','اسم العملة','الراتب','حساب الدخول','الصلاحية'],state.employees.map(e=>{const u=employeeAccount(e.id),c=getBranchCurrency(e.branch);return [e.code,e.name,e.email,e.phone,e.department,e.jobTitle,e.branch,e.nationalId||'',e.birthDate||'',e.contractType||'',e.contractStart||'',e.contractEnd||'',e.bankName||'',e.bankAccount||'',e.insuranceNumber||'',e.taxNumber||'',e.insuranceDeduction||0,e.taxDeduction||0,c,currencyLabel(c),e.salary,u?.email||'',u?accountPermissionLabel(u):'']}))}

function renderAttendance(){
  normalizeAllAttendanceRecords();
  const ids=visibleEmployees().map(e=>e.id);
  const records=state.attendance.filter(a=>ids.includes(a.employeeId)).sort(attendanceSort);
  const employeeOptions=visibleEmployees().map(e=>`<option value="${e.id}">${escapeHTML(e.name)} — ${escapeHTML(e.code||'')}</option>`).join('');
  const branchOptions=getBranches().map(b=>`<option value="${escapeHTML(b)}">${escapeHTML(b)}</option>`).join('');
  const todayRecords=records.filter(a=>a.date===todayISO());
  return `<div class="attendance-manager">
    <section class="attendance-banner">
      <div class="attendance-banner-title"><span class="attendance-banner-icon">♟◷</span><div><h2>إدارة سجلات الحضور</h2><p>نظام متابعة ذكي يحسب التأخير والإضافي تلقائيًا ويكشف الغياب والخروج غير المسجل.</p></div></div>
      <div class="attendance-banner-actions">
        ${ownEmployee()?'<button class="att-top-btn att-punch" onclick="openPunchPanel()">◷ تسجيل حضوري</button>':''}
        ${canManage()?'<button class="att-top-btn att-manual" onclick="manualAttendanceModal()">＋ إضافة سجل يدوي</button><button class="att-top-btn att-import" onclick="importAttendanceModal()">▣ استيراد حضور</button><button class="att-top-btn att-auto" onclick="generateAbsenceModal()">☑ توليد الغياب</button>':''}
        <button class="att-top-btn att-report" onclick="go('reports')">⌁ التقارير</button>
      </div>
    </section>

    <section class="attendance-insights no-print" id="attendanceInsights">${attendanceInsightsHTML(todayRecords)}</section>

    <section class="attendance-filter-card no-print">
      <div class="attendance-filter-grid att-grid-7">
        <div class="att-filter-field"><label>الموظف</label><select class="select" id="attEmployee" onchange="filterAttendanceRows()"><option value="">جميع الموظفين</option>${employeeOptions}</select></div>
        <div class="att-filter-field"><label>من تاريخ</label><input class="input" id="attFrom" type="date" value="${todayISO()}" onchange="filterAttendanceRows()"></div>
        <div class="att-filter-field"><label>إلى تاريخ</label><input class="input" id="attTo" type="date" value="${todayISO()}" onchange="filterAttendanceRows()"></div>
        <div class="att-filter-field"><label>الحالة</label><select class="select" id="attStatus" onchange="filterAttendanceRows()"><option value="">جميع الحالات</option><option value="present">حاضر</option><option value="late">متأخر</option><option value="absent">غائب</option></select></div>
        <div class="att-filter-field"><label>ملاحظة</label><select class="select" id="attIssue" onchange="filterAttendanceRows()"><option value="">كل السجلات</option><option value="missingOut">خروج غير مسجل</option><option value="late">تأخير</option><option value="overtime">إضافي</option><option value="unverified">تحقق ناقص</option><option value="absent">غياب</option></select></div>
        <div class="att-filter-field"><label>الفرع</label><select class="select" id="attBranch" onchange="filterAttendanceRows()"><option value="">جميع الفروع</option>${branchOptions}</select></div>
        <div class="att-filter-field"><label>عدد السجلات</label><select class="select" id="attLimit" onchange="filterAttendanceRows()"><option value="15">15</option><option value="25">25</option><option value="50">50</option><option value="100">100</option><option value="all">الكل</option></select></div>
      </div>
      <div class="attendance-filter-footer">
        <div class="att-search-actions"><button class="att-square-btn att-reset" title="إعادة تعيين" onclick="clearAttendanceFilters()">×</button><button class="att-square-btn att-search" title="بحث" onclick="filterAttendanceRows()">⌕</button><span class="att-result-count" id="attVisibleCount">${records.length} سجل</span></div>
        <div class="att-export-actions"><button class="att-export-btn excel" onclick="exportAttendance()">▣ تصدير Excel</button><button class="att-export-btn pdf" onclick="printAttendancePDF()">▤ تصدير PDF</button></div>
      </div>
    </section>

    <section class="attendance-table-card">${attendanceTable(records,true)}</section>
  </div>`;
}
function attendanceSort(a,b){return (`${b.date}${b.checkIn||''}`).localeCompare(`${a.date}${a.checkIn||''}`)}
function attendanceTable(records,filterable=false){
  if(!records.length)return `<div class="empty"><span class="emoji">◷</span>لا توجد سجلات حضور</div>`;
  return `<div class="table-wrap attendance-table-wrap"><table class="table attendance-records-table" ${filterable?'id="attendanceTable"':''}><thead><tr><th class="check-col"><input type="checkbox" aria-label="تحديد الكل" onchange="toggleAttendanceSelection(this)"></th><th>الموظف</th><th>التاريخ</th><th>الوردية</th><th>وقت الدخول</th><th>وقت الخروج</th><th>ساعات العمل</th><th>التأخير</th><th>الإضافي</th><th>الفرع</th><th>الحالة</th><th>المصدر</th><th>مواقع التسجيل</th><th>الإجراءات</th></tr></thead><tbody>${records.map(attendanceRow).join('')}</tbody></table></div>`
}
function attendanceRow(a){
  const e=emp(a.employeeId)||{};
  const sh=shift(e.shiftId), plan=shiftDaySchedule(sh,a.date);
  const source=a.source||(a.location==='إدخال يدوي'?'manual':'mobile');
  const missingOut=attendanceIssue(a)==='missingOut';
  const workMinutes=attendanceActualMinutes(a), shiftLabel=plan?`${plan.start} — ${plan.end}`:'راحة';
  const sourceText=source==='auto'?'☑ توليد تلقائي':source==='manual'?'⌨ تسجيل يدوي':'▣ تطبيق الجوال';
  const sourceClass=source==='auto'?'source-auto':source==='manual'?'source-manual':'source-mobile';
  return `<tr data-record-id="${a.id}" data-id="${a.id}" data-date="${a.date}" data-status="${a.status}" data-issue="${attendanceIssue(a)}" data-employee="${a.employeeId}" data-branch="${escapeHTML(e.branch||'')}">
    <td class="check-col"><input class="att-row-check" type="checkbox" aria-label="تحديد السجل"></td>
    <td><div class="employee-cell att-employee">${avatarHTML(e,36)}<div><strong>${escapeHTML(e.name||'-')}</strong><small>${escapeHTML(e.code||'')} · ${escapeHTML(e.department||'-')}</small></div></div></td>
    <td><span class="att-date">${escapeHTML(a.date)} <span>▦</span></span></td>
    <td><span class="att-shift-pill">${escapeHTML(shiftLabel)}</span></td>
    <td>${a.checkIn?`<span class="time-pill time-in">↪ ${fmtTime(a.checkIn)}</span>`:'<span class="muted">—</span>'}</td>
    <td>${missingOut?'<span class="time-pill time-missing">◷ لم يسجل خروج</span>':(a.checkOut?`<span class="time-pill time-out">↩ ${fmtTime(a.checkOut)}</span>`:'<span class="muted">—</span>')}</td>
    <td><span class="att-mini-pill ${workMinutes?'ok':'muted'}">${workMinutes?minutesToHM(workMinutes):'—'}</span></td>
    <td><span class="att-mini-pill ${Number(a.lateMinutes||0)>0?'warn':'muted'}">${Number(a.lateMinutes||0)>0?minutesToHM(a.lateMinutes):'—'}</span></td>
    <td><span class="att-mini-pill ${Number(a.overtimeMinutes||0)>0?'ok':'muted'}">${Number(a.overtimeMinutes||0)>0?minutesToHM(a.overtimeMinutes):'—'}</span></td>
    <td>${e.branch?`<span class="branch-pill">▣ ${escapeHTML(e.branch)}</span>`:'<span class="muted">—</span>'}</td>
    <td>${statusBadge(a.status)}</td>
    <td><span class="source-pill ${sourceClass}">${sourceText}</span></td>
    <td><div class="att-location-stack">${a.location&&a.location!=='إدخال يدوي'&&a.location!=='غياب تلقائي'?`<button class="map-pill map-in" onclick="showAttendanceLocation('${a.id}','in')">● حضور</button>`:'<span class="att-location-muted">حضور —</span>'}${a.checkOutLocation?`<button class="map-pill map-out" onclick="showAttendanceLocation('${a.id}','out')">● خروج</button>`:'<span class="att-location-muted">خروج —</span>'}</div></td>
    <td><div class="att-row-actions"><button class="mini-action view" title="عرض" onclick="viewAttendance('${a.id}')">◉</button>${canManage()?`<button class="mini-action edit" title="تعديل" onclick="editAttendanceModal('${a.id}')">✎</button><button class="mini-action delete" title="حذف" onclick="deleteAttendance('${a.id}')">■</button>`:''}</div></td>
  </tr>`;
}
function getAttendanceFilter(){return {employee:$('#attEmployee')?.value||'',from:$('#attFrom')?.value||'',to:$('#attTo')?.value||'',status:$('#attStatus')?.value||'',issue:$('#attIssue')?.value||'',branch:$('#attBranch')?.value||'',limit:$('#attLimit')?.value||'15'}}
function attendanceMatches(a,f){const e=emp(a.employeeId);return (!f.employee||a.employeeId===f.employee)&&(!f.from||a.date>=f.from)&&(!f.to||a.date<=f.to)&&(!f.status||a.status===f.status)&&(!f.issue||attendanceIssue(a)===f.issue)&&(!f.branch||e?.branch===f.branch)}
function filteredAttendanceRecords(ignoreLimit=false){const ids=visibleEmployees().map(e=>e.id),f=getAttendanceFilter();return state.attendance.filter(a=>ids.includes(a.employeeId)&&attendanceMatches(a,f)).sort(attendanceSort)}
function filterAttendanceRows(){
  const f=getAttendanceFilter(), rows=$$('#attendanceTable tbody tr');let shown=0,total=0;const max=f.limit==='all'?Infinity:Number(f.limit||15),visibleRecords=[];
  rows.forEach(r=>{const match=(!f.employee||r.dataset.employee===f.employee)&&(!f.from||r.dataset.date>=f.from)&&(!f.to||r.dataset.date<=f.to)&&(!f.status||r.dataset.status===f.status)&&(!f.issue||r.dataset.issue===f.issue)&&(!f.branch||r.dataset.branch===f.branch);if(match)total++;const visible=match&&shown<max;r.style.display=visible?'':'none';if(visible){shown++;const rec=state.attendance.find(a=>a.id===r.dataset.id);if(rec)visibleRecords.push(rec)}else{const cb=r.querySelector('.att-row-check');if(cb)cb.checked=false}});
  const count=$('#attVisibleCount');if(count)count.textContent=`عرض ${shown} من ${total} سجل`;
  const insights=$('#attendanceInsights');if(insights)insights.innerHTML=attendanceInsightsHTML(visibleRecords.length?visibleRecords:filteredAttendanceRecords().slice(0,max===Infinity?undefined:max));
  updateBulkSelection?.();
}
function clearAttendanceFilters(){if($('#attEmployee'))$('#attEmployee').value='';if($('#attFrom'))$('#attFrom').value=todayISO();if($('#attTo'))$('#attTo').value=todayISO();if($('#attStatus'))$('#attStatus').value='';if($('#attIssue'))$('#attIssue').value='';if($('#attBranch'))$('#attBranch').value='';if($('#attLimit'))$('#attLimit').value='15';filterAttendanceRows()}
function toggleAttendanceSelection(master){$$('.att-row-check').forEach(c=>{if(c.closest('tr').style.display!=='none')c.checked=master.checked});updateBulkSelection?.()}
function attendanceInsightsHTML(records){
  records=records||[];
  const present=records.filter(a=>['present','late'].includes(a.status)).length,late=records.filter(a=>a.status==='late').length,absent=records.filter(a=>a.status==='absent').length,missing=records.filter(a=>attendanceIssue(a)==='missingOut').length;
  const lateMin=records.reduce((n,a)=>n+Number(a.lateMinutes||0),0),overMin=records.reduce((n,a)=>n+Number(a.overtimeMinutes||0),0),workMin=records.reduce((n,a)=>n+attendanceActualMinutes(a),0);
  return `<div class="attendance-kpi-grid"><article class="attendance-kpi tone-primary"><span>✓</span><div><small>حاضر / متأخر</small><strong>${present}</strong><p>${records.length} سجل معروض</p></div></article><article class="attendance-kpi tone-warn"><span>⏱</span><div><small>تأخير</small><strong>${late}</strong><p>${minutesToHM(lateMin)} إجمالي التأخير</p></div></article><article class="attendance-kpi tone-danger"><span>✕</span><div><small>غياب</small><strong>${absent}</strong><p>${missing} خروج غير مسجل</p></div></article><article class="attendance-kpi tone-success"><span>＋</span><div><small>ساعات العمل / الإضافي</small><strong>${minutesToHM(workMin)}</strong><p>${minutesToHM(overMin)} إضافي</p></div></article></div>`
}
function openPunchPanel(){
  const me=ownEmployee(),today=state.attendance.find(a=>a.employeeId===me?.id&&a.date===todayISO());
  openModal('تسجيل الحضور والانصراف',`<div class="punch-modal"><div class="small muted">الوقت الحالي</div><div class="live-clock" id="liveClock">--:--:--</div><div class="today-date">${new Intl.DateTimeFormat('ar-EG',{weekday:'long',day:'numeric',month:'long'}).format(new Date())}</div><div class="punch-status-grid"><div><span>الدخول</span><strong>${fmtTime(today?.checkIn)}</strong></div><div><span>الخروج</span><strong>${fmtTime(today?.checkOut)}</strong></div><div><span>التأخير</span><strong>${minutesToHM(today?.lateMinutes||0)}</strong></div><div><span>الإضافي</span><strong>${minutesToHM(today?.overtimeMinutes||0)}</strong></div></div><div class="punch-actions"><button class="btn btn-success" onclick="punch('in')" ${today?.checkIn?'disabled':''}>✓ تسجيل دخول</button><button class="btn btn-danger" onclick="punch('out')" ${!today?.checkIn||today?.checkOut?'disabled':''}>↪ تسجيل خروج</button></div><button class="btn btn-secondary btn-sm" onclick="openCamera()">📷 إثبات الكاميرا ${faceVerifiedSession?'✓':''}</button></div>`);startClock();
}
function showAttendanceLocation(id,type='in'){
  const a=state.attendance.find(x=>x.id===id);if(!a)return;
  const coords=type==='out'?a.checkOutCoords:a.coords;const label=type==='out'?(a.checkOutLocation||'موقع الانصراف غير مسجل'):(a.location||'الموقع غير مسجل');
  if(coords?.lat!=null&&coords?.lng!=null){window.open(`https://www.google.com/maps?q=${coords.lat},${coords.lng}`,'_blank','noopener');return}
  openModal(type==='out'?'موقع تسجيل الانصراف':'موقع تسجيل الحضور',`<div class="notice">📍 ${escapeHTML(label)}</div><p class="muted">لا توجد إحداثيات GPS محفوظة لهذا السجل، لذلك يظهر وصف الموقع فقط.</p>`);
}
function viewAttendance(id){
  const a=state.attendance.find(x=>x.id===id),e=emp(a?.employeeId),sh=shift(e?.shiftId),plan=shiftDaySchedule(sh,a?.date);if(!a)return;
  openModal('تفاصيل سجل الحضور',`<div class="employee-cell" style="margin-bottom:18px">${avatarHTML(e,58)}<div><h3 style="margin:0 0 5px">${escapeHTML(e?.name||'-')}</h3><div class="muted">${escapeHTML(e?.code||'')} — ${escapeHTML(e?.branch||'-')}</div></div></div><div class="grid grid-2">${infoCard('التاريخ',a.date)}${infoCard('الحالة',({present:'حاضر',late:'متأخر',absent:'غائب'}[a.status]||a.status))}${infoCard('الوردية',plan?`${plan.start} — ${plan.end}`:'راحة / غير محددة')}${infoCard('ساعات العمل الفعلية',minutesToHM(attendanceActualMinutes(a)))}${infoCard('وقت الدخول',fmtTime(a.checkIn))}${infoCard('وقت الخروج',fmtTime(a.checkOut))}${infoCard('موقع الحضور',a.location||'-')}${infoCard('موقع الانصراف',a.checkOutLocation||'-')}${infoCard('التأخير',`${a.lateMinutes||0} دقيقة`)}${infoCard('العمل الإضافي',`${a.overtimeMinutes||0} دقيقة`)}${infoCard('إثبات الكاميرا',a.faceVerified?'تم':'لم يتم')}${infoCard('التحقق بالموقع',a.geoVerified?'تم':'لم يتم')}</div>`)
}
function isoTimeValue(value){if(!value)return '';const d=new Date(value);return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`}
function combineAttendanceDateTime(date,time){if(!date||!time)return null;const d=parseLocalDate(date),parts=String(time).split(':').map(Number);d.setHours(parts[0]||0,parts[1]||0,0,0);return d.toISOString()}
function normalizeAttendanceRecord(a){
  if(!a)return a;
  if(a.status==='absent'){a.checkIn=null;a.checkOut=null;a.lateMinutes=0;a.overtimeMinutes=0;if(!a.location)a.location='غياب';return a}
  if(a.checkIn&&a.checkOut){const i=new Date(a.checkIn),o=new Date(a.checkOut);if(o<=i){o.setDate(o.getDate()+1);a.checkOut=o.toISOString()}}
  const e=emp(a.employeeId),sh=shift(e?.shiftId);
  a.lateMinutes=a.checkIn?calculateLate(new Date(a.checkIn),sh):0;
  a.overtimeMinutes=a.checkOut?calculateOvertime(new Date(a.checkOut),sh,a.date):0;
  a.earlyLeaveMinutes=a.checkOut?calculateEarlyLeave(new Date(a.checkOut),sh,a.date):0;
  a.workShortageMinutes=Number(a.lateMinutes||0)+Number(a.earlyLeaveMinutes||0);
  if(!a.checkIn&&!a.checkOut){a.status='absent';a.location=a.location||'غياب';a.lateMinutes=0;a.overtimeMinutes=0;a.earlyLeaveMinutes=0;a.workShortageMinutes=0}
  else a.status=Number(a.lateMinutes||0)>0?'late':'present';
  return a
}
function normalizeAllAttendanceRecords(){(state.attendance||[]).forEach(a=>{if(a&&!a._normalizedV380){normalizeAttendanceRecord(a);a._normalizedV380=true}})}
function attendanceActualMinutes(a){if(!a?.checkIn||!a?.checkOut)return 0;const mins=Math.floor((new Date(a.checkOut)-new Date(a.checkIn))/60000);return Math.max(0,mins)}
function attendanceIssue(a){if(!a)return '';if(a.status==='absent')return 'absent';if(a.checkIn&&!a.checkOut)return 'missingOut';if(Number(a.lateMinutes||0)>0)return 'late';if(Number(a.overtimeMinutes||0)>0)return 'overtime';if(a.faceVerified===false||a.geoVerified===false)return 'unverified';return 'ok'}
function editAttendanceModal(id){
  const a=state.attendance.find(x=>x.id===id);if(!a)return;
  openModal('تعديل سجل الحضور',`<form id="editAttForm" class="form-grid"><input type="hidden" name="id" value="${a.id}"><div class="field"><label>الموظف</label><select class="select" name="employeeId">${visibleEmployees().map(e=>`<option value="${e.id}" ${e.id===a.employeeId?'selected':''}>${escapeHTML(e.name)} — ${escapeHTML(e.code||'')}</option>`).join('')}</select></div>${field('التاريخ','date',a.date,'date',true)}${field('وقت الدخول','checkIn',isoTimeValue(a.checkIn),'time')}${field('وقت الخروج','checkOut',isoTimeValue(a.checkOut),'time')}<div class="field"><label>الحالة</label><select class="select" name="status"><option value="auto" ${a.status!=='absent'?'selected':''}>احتساب تلقائي حسب الوردية</option><option value="absent" ${a.status==='absent'?'selected':''}>غائب</option></select><div class="help">التأخير والإضافي يتم حسابهما تلقائيًا من وردية الموظف.</div></div>${field('موقع الحضور','location',a.location||'','text')}${field('موقع الانصراف','checkOutLocation',a.checkOutLocation||'','text')}</form>`,saveEditedAttendance)
}
function saveEditedAttendance(){
  const f=Object.fromEntries(new FormData($('#editAttForm')).entries()),a=state.attendance.find(x=>x.id===f.id);if(!a)return;
  const duplicate=state.attendance.find(x=>x.id!==a.id&&x.employeeId===f.employeeId&&x.date===f.date);if(duplicate)return toast('يوجد سجل لنفس الموظف في نفس التاريخ. عدّل السجل الموجود أو احذفه أولًا.','error');
  Object.assign(a,{employeeId:f.employeeId,date:f.date,checkIn:combineAttendanceDateTime(f.date,f.checkIn),checkOut:combineAttendanceDateTime(f.date,f.checkOut),status:f.status==='absent'?'absent':'present',location:f.location||'إدخال يدوي',checkOutLocation:f.checkOutLocation||'',source:'manual',updatedAt:new Date().toISOString(),_normalizedV380:false});
  normalizeAttendanceRecord(a);saveState();closeModal();render();toast('تم تعديل سجل الحضور واحتساب التأخير والإضافي تلقائيًا')
}
function deleteAttendance(id){if(!confirm('هل تريد حذف سجل الحضور؟'))return;state.attendance=state.attendance.filter(a=>a.id!==id);saveState();render();toast('تم حذف السجل')}
function printAttendancePDF(){document.body.classList.add('printing-attendance');window.print();setTimeout(()=>document.body.classList.remove('printing-attendance'),500)}
function manualAttendanceModal(){
  openModal('إضافة سجل حضور يدوي',`<form id="manualAttForm" class="form-grid"><div class="field"><label>الموظف</label><select class="select" name="employeeId">${visibleEmployees().map(e=>`<option value="${e.id}">${escapeHTML(e.name)} — ${escapeHTML(e.code||'')}</option>`).join('')}</select></div>${field('التاريخ','date',todayISO(),'date',true)}${field('وقت الدخول','checkIn','09:00','time')}${field('وقت الخروج','checkOut','17:00','time')}<div class="field"><label>الحالة</label><select class="select" name="status"><option value="auto">احتساب تلقائي حسب الوردية</option><option value="absent">غائب</option></select><div class="help">سيتم حساب التأخير والإضافي تلقائيًا، ولو اخترت غائب سيتم حذف أوقات الدخول والخروج.</div></div>${field('موقع الحضور','location','إدخال يدوي','text')}${field('موقع الانصراف','checkOutLocation','','text')}</form>`,saveManualAttendance)
}
function saveManualAttendance(){
  const f=Object.fromEntries(new FormData($('#manualAttForm')).entries());
  const existing=state.attendance.find(x=>x.employeeId===f.employeeId&&x.date===f.date);
  if(existing&&!confirm('يوجد سجل حضور لنفس الموظف في هذا التاريخ. هل تريد تحديثه بدل إضافة سجل مكرر؟'))return;
  const rec=existing||{id:uid('a'),faceVerified:false,geoVerified:false,createdAt:new Date().toISOString()};
  Object.assign(rec,{employeeId:f.employeeId,date:f.date,checkIn:combineAttendanceDateTime(f.date,f.checkIn),checkOut:combineAttendanceDateTime(f.date,f.checkOut),status:f.status==='absent'?'absent':'present',location:f.location||'إدخال يدوي',checkOutLocation:f.checkOutLocation||'',source:'manual',updatedAt:new Date().toISOString(),_normalizedV380:false});
  normalizeAttendanceRecord(rec);if(!existing)state.attendance.push(rec);saveState();closeModal();render();toast(existing?'تم تحديث سجل الحضور':'تمت إضافة السجل واحتساب التأخير والإضافي')
}
function importAttendanceModal(){openModal('استيراد حضور جماعي',`<div class="notice">ارفع ملف CSV بالأعمدة التالية: code,date,checkIn,checkOut,status,location,checkOutLocation</div><div class="field"><label>ملف الحضور</label><input class="input" id="attendanceImportFile" type="file" accept=".csv,text/csv"></div><div class="help" style="margin-top:12px">مثال: EMP-001,2026-07-13,09:00,17:00,present,المقر الرئيسي,المقر الرئيسي<br>لو وجد سجل لنفس الموظف والتاريخ سيتم تحديثه بدل إنشاء تكرار.</div>`,importAttendanceCSV,'استيراد الملف')}
function importAttendanceCSV(){const file=$('#attendanceImportFile')?.files?.[0];if(!file)return toast('اختر ملف CSV أولًا','error');const reader=new FileReader();reader.onload=()=>{try{const lines=String(reader.result||'').replace(/^\uFEFF/,'').split(/\r?\n/).filter(Boolean);if(lines.length<2)throw new Error('empty');const headers=lines[0].split(',').map(x=>x.trim().replace(/^"|"$/g,''));let added=0,updated=0;lines.slice(1).forEach(line=>{const vals=line.split(',').map(x=>x.trim().replace(/^"|"$/g,'')),row=Object.fromEntries(headers.map((h,i)=>[h,vals[i]||''])),e=state.employees.find(x=>x.code===row.code||x.email===row.email);if(!e||!row.date)return;const existing=state.attendance.find(x=>x.employeeId===e.id&&x.date===row.date),rec=existing||{id:uid('a'),faceVerified:false,geoVerified:false,createdAt:new Date().toISOString()};Object.assign(rec,{employeeId:e.id,date:row.date,checkIn:combineAttendanceDateTime(row.date,row.checkIn),checkOut:combineAttendanceDateTime(row.date,row.checkOut),status:row.status==='absent'?'absent':'present',location:row.location||'استيراد CSV',checkOutLocation:row.checkOutLocation||'',source:'manual',updatedAt:new Date().toISOString(),_normalizedV380:false});normalizeAttendanceRecord(rec);if(existing)updated++;else{state.attendance.push(rec);added++}});saveState();closeModal();render();toast(`تم استيراد ${added} سجل جديد وتحديث ${updated} سجل`) }catch{toast('تعذر قراءة الملف. تأكد من تنسيق CSV','error')}};reader.readAsText(file,'UTF-8')}
function attendanceIssueLabel(v){return {missingOut:'خروج غير مسجل',late:'تأخير',overtime:'إضافي',unverified:'تحقق ناقص',absent:'غياب',ok:'سليم'}[v]||''}
function attendanceDateRange(from,to){const a=parseLocalDate(from),b=parseLocalDate(to),out=[];for(let d=new Date(a);d<=b;d.setDate(d.getDate()+1))out.push(d.toISOString().slice(0,10));return out}
function attendanceCoveredByApproved(employee,date){
  const id=employee.id;
  if((state.leaves||[]).some(l=>l.employeeId===id&&l.status==='approved'&&date>=l.from&&date<=l.to))return true;
  if((state.missions||[]).some(m=>m.employeeId===id&&m.status==='approved'&&m.date===date))return true;
  if((state.holidays||[]).some(h=>h.status==='active'&&(!h.branch||h.branch===employee.branch)&&date>=h.from&&date<=h.to))return true;
  return false
}
function generateAbsenceModal(){
  const branchOptions=getBranches().map(b=>`<option value="${escapeHTML(b)}">${escapeHTML(b)}</option>`).join('');
  openModal('توليد الغياب الناقص',`<form id="absenceGenForm" class="form-grid"><div class="field"><label>الفرع</label><select class="select" name="branch"><option value="">كل الفروع</option>${branchOptions}</select></div><div class="field"><label>الموظف</label><select class="select" name="employeeId"><option value="">كل الموظفين النشطين</option>${visibleEmployees().filter(e=>e.status==='active').map(e=>`<option value="${e.id}">${escapeHTML(e.name)} — ${escapeHTML(e.branch||'')}</option>`).join('')}</select></div>${field('من تاريخ','from',todayISO(),'date',true)}${field('إلى تاريخ','to',todayISO(),'date',true)}<div class="field full"><div class="notice">سيتم إنشاء سجل غياب فقط لأيام العمل حسب الوردية، مع تجاهل الأيام التي بها حضور أو إجازة معتمدة أو مأمورية أو عطلة.</div></div></form>`,generateMissingAbsences,'توليد الغياب')
}
function generateMissingAbsences(){
  const f=Object.fromEntries(new FormData($('#absenceGenForm')).entries());if(!f.from||!f.to||f.from>f.to)return toast('حدد نطاق تاريخ صحيح','error');
  const dates=attendanceDateRange(f.from,f.to).filter(d=>d<=todayISO());if(dates.length>62)return toast('النطاق كبير جدًا. اختر فترة لا تزيد عن 62 يومًا في المرة الواحدة.','error');
  const employees=visibleEmployees().filter(e=>e.status==='active'&&(!f.branch||e.branch===f.branch)&&(!f.employeeId||e.id===f.employeeId));let added=0,skipped=0;
  employees.forEach(e=>dates.forEach(date=>{if(!shiftDaySchedule(shift(e.shiftId),date)){skipped++;return}if(state.attendance.some(a=>a.employeeId===e.id&&a.date===date)){skipped++;return}if(attendanceCoveredByApproved(e,date)){skipped++;return}state.attendance.push({id:uid('a'),employeeId:e.id,date,checkIn:null,checkOut:null,lateMinutes:0,overtimeMinutes:0,status:'absent',location:'غياب تلقائي',checkOutLocation:'',faceVerified:false,geoVerified:false,source:'auto',generatedAt:new Date().toISOString(),generatedBy:currentUser?.id});added++}));
  if(!added)return toast('لا توجد أيام غياب ناقصة في النطاق المحدد','error');logAudit('توليد غياب تلقائي','الحضور',`${added} سجل غياب`);saveState();closeModal();render();toast(`تم إنشاء ${added} سجل غياب، وتجاهل ${skipped} يوم غير مطلوب`)
}

async function punch(type){
  const e=ownEmployee(); if(!e)return toast('لا يوجد ملف موظف مرتبط بالحساب','error');
  let loc={label:'غير متاح',verified:false,lat:null,lng:null};
  try{loc=await getLocation()}catch(err){if(state.settings.requireGPS)return toast('تعذر التحقق من الموقع، ولا يمكن تسجيل الحضور','error')}
  if(state.settings.requireFace&&!faceVerifiedSession)return toast('يجب إثبات الكاميرا أولًا','error');
  const record=state.attendance.find(a=>a.employeeId===e.id&&a.date===todayISO());
  if(type==='in'){
    if(record?.checkIn)return toast('تم تسجيل الدخول بالفعل','error');
    const now=new Date(), sh=shift(e.shiftId), late=calculateLate(now,sh); state.attendance.push({id:uid('a'),employeeId:e.id,date:todayISO(),checkIn:now.toISOString(),checkOut:null,lateMinutes:late,overtimeMinutes:0,status:late>0?'late':'present',location:loc.label,faceVerified:faceVerifiedSession,geoVerified:loc.verified,coords:{lat:loc.lat,lng:loc.lng},source:'mobile'});
    toast('تم تسجيل الدخول بنجاح');
  }else{
    if(!record?.checkIn)return toast('سجّل الدخول أولًا','error'); if(record.checkOut)return toast('تم تسجيل الخروج بالفعل','error');
    const now=new Date();record.checkOut=now.toISOString();record.overtimeMinutes=calculateOvertime(now,shift(e.shiftId),record.date);record.checkOutLocation=loc.label;record.checkOutCoords={lat:loc.lat,lng:loc.lng};toast('تم تسجيل الخروج بنجاح');
  }
  faceVerifiedSession=false;saveState();closeModal();render();
}
function calculateLate(now,sh){const r=shiftDaySchedule(sh,now);if(!r)return 0;const [h,m]=r.start.split(':').map(Number),start=new Date(now);start.setHours(h,m+Number(sh.grace||0),0,0);return Math.max(0,Math.floor((now-start)/60000))}
function calculateOvertime(now,sh,workDate=now){const r=shiftDaySchedule(sh,workDate);if(!r)return 0;const base=parseLocalDate(workDate),[shh,sm]=r.start.split(':').map(Number),[eh,em]=r.end.split(':').map(Number),end=new Date(base);end.setHours(eh,em,0,0);if(timeToMinutes(r.end)<=timeToMinutes(r.start))end.setDate(end.getDate()+1);return Math.max(0,Math.floor((now-end)/60000))}
function calculateEarlyLeave(now,sh,workDate=now){const r=shiftDaySchedule(sh,workDate);if(!r)return 0;const base=parseLocalDate(workDate),[eh,em]=r.end.split(':').map(Number),end=new Date(base);end.setHours(eh,em,0,0);if(timeToMinutes(r.end)<=timeToMinutes(r.start))end.setDate(end.getDate()+1);return Math.max(0,Math.floor((end-now)/60000))}
function getLocation(){return new Promise((resolve,reject)=>{if(!navigator.geolocation)return reject(new Error('unsupported'));navigator.geolocation.getCurrentPosition(p=>{const lat=p.coords.latitude,lng=p.coords.longitude,d=distanceMeters(lat,lng,state.settings.geofenceLat,state.settings.geofenceLng);resolve({lat,lng,verified:d<=state.settings.geofenceRadius,label:`${lat.toFixed(5)}, ${lng.toFixed(5)} — ${Math.round(d)}م من المقر`})},reject,{enableHighAccuracy:true,timeout:10000,maximumAge:30000})})}
function distanceMeters(a,b,c,d){const R=6371e3,p1=a*Math.PI/180,p2=c*Math.PI/180,dp=(c-a)*Math.PI/180,dl=(d-b)*Math.PI/180;const x=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x))}
function openCamera(){openModal('إثبات الكاميرا',`<div class="camera-box"><video id="cameraVideo" autoplay playsinline></video><canvas id="cameraCanvas" class="hidden"></canvas></div><div class="camera-note">هذه نسخة تجريبية تلتقط صورة فقط ولا تنفذ مطابقة بيومترية حقيقية. المطابقة الفعلية تحتاج خادمًا آمنًا ونموذج تعرّف على الوجه وموافقة الموظف.</div>`,captureFace,'التقاط والتحقق');if(!navigator.mediaDevices?.getUserMedia){toast('هذا المتصفح لا يدعم تشغيل الكاميرا','error');return;}navigator.mediaDevices.getUserMedia({video:{facingMode:'user'},audio:false}).then(s=>{cameraStream=s;$('#cameraVideo').srcObject=s}).catch(()=>toast('تعذر تشغيل الكاميرا','error'))}
function captureFace(){const v=$('#cameraVideo'),c=$('#cameraCanvas');if(!v||!v.videoWidth)return toast('الكاميرا غير جاهزة','error');c.width=v.videoWidth;c.height=v.videoHeight;c.getContext('2d').drawImage(v,0,0);faceVerifiedSession=true;stopCamera();closeModal();render();toast('تم التحقق التجريبي بالكاميرا')}
function stopCamera(){cameraStream?.getTracks().forEach(t=>t.stop());cameraStream=null}
function renderLeaves(){
  const ids=visibleEmployees().map(e=>e.id), list=state.leaves.filter(l=>ids.includes(l.employeeId)).sort((a,b)=>(b.createdAt||b.from).localeCompare(a.createdAt||a.from));
  const typeStats=getLeaveTypes().map(t=>({id:t.id,name:t.name,paid:t.paid,annualDays:t.annualDays||0,days:list.filter(l=>l.status==='approved'&&(l.leaveTypeId===t.id||l.type===t.name)).reduce((s,l)=>s+Number(l.days||0),0)}));
  return `<div class="page-head"><div><h2>إدارة الإجازات</h2><p>طلبات الإجازة، أنواعها، الأرصدة، والموافقات.</p></div><button class="btn btn-primary" onclick="leaveModal()">＋ طلب إجازة</button></div>
  <div class="grid grid-4">${metric('☀',getLeaveTypes().length,'أنواع الإجازات','يمكن إدارتها من الإعدادات')}${metric('✓',list.filter(l=>l.status==='approved').reduce((s,l)=>s+Number(l.days||0),0),'أيام معتمدة','كل أنواع الإجازات')}${metric('⌛',list.filter(l=>l.status==='pending').length,'طلبات معلقة','بانتظار الموافقة')}${metric('◉',list.filter(l=>l.status==='approved'&&l.paid===false).reduce((s,l)=>s+Number(l.days||0),0),'أيام بدون راتب','تظهر في احتساب الراتب')}</div>
  <div class="card" style="margin-top:18px"><div class="card-title"><h3>ملخص الأنواع</h3></div><div class="type-summary">${typeStats.map(t=>`<span class="type-summary-item"><strong>${escapeHTML(t.name)}</strong><small>${t.paid?'مدفوعة':'بدون راتب'} · مستخدم ${t.days} يوم${t.annualDays?` · رصيد سنوي ${t.annualDays}`:''}</small></span>`).join('')}</div></div>
  <div class="card" style="margin-top:18px">${requestTable(list,'leave')}</div>`;
}
function requestTable(list,type){
  const isLeave=type==='leave'; if(!list.length)return `<div class="empty"><span class="emoji">☂</span>لا توجد طلبات</div>`;
  return `<div class="table-wrap"><table class="table"><thead><tr><th>الموظف</th><th>${isLeave?'النوع':'العنوان'}</th><th>${isLeave?'الفترة':'التاريخ'}</th><th>${isLeave?'الأيام':'الموقع'}</th><th>التفاصيل</th>${isLeave?'<th>المعاملة المالية</th>':''}<th>الحالة</th><th>إجراءات</th></tr></thead><tbody>${list.map(r=>`<tr data-record-id="${r.id}" data-status="${escapeHTML(r.status||'')}"><td>${escapeHTML(emp(r.employeeId)?.name||'-')}</td><td>${escapeHTML(isLeave?r.type:r.title)}</td><td>${isLeave?`${fmtDate(r.from)} — ${fmtDate(r.to)}`:fmtDate(r.date)}</td><td>${escapeHTML(isLeave?r.days:r.location)}</td><td>${escapeHTML(isLeave?r.reason:r.notes||'-')}</td>${isLeave?`<td><span class="badge badge-${r.paid===false?'danger':'success'}">${r.paid===false?'بدون راتب':'مدفوعة'}</span></td>`:''}<td>${statusBadge(r.status)}</td><td><div class="actions">${isLeave&&(canManage()||(r.employeeId===currentUser.employeeId&&r.status==='pending'))?`<button class="btn btn-secondary btn-sm" onclick="leaveModal('${r.id}')">تعديل</button>`:''}${canManage()&&r.status==='pending'?`<button class="btn btn-success btn-sm" onclick="setRequestStatus('${type}','${r.id}','approved')">قبول</button><button class="btn btn-danger btn-sm" onclick="setRequestStatus('${type}','${r.id}','rejected')">رفض</button>`:''}${r.employeeId===currentUser.employeeId&&r.status==='pending'?`<button class="btn btn-danger btn-sm" onclick="deleteRequest('${type}','${r.id}')">إلغاء</button>`:''}</div></td></tr>`).join('')}</tbody></table></div>`;
}
function leaveModal(id=''){
  const x=id?state.leaves.find(v=>v.id===id):null,selectedEmployee=x?.employeeId||ownEmployee()?.id||visibleEmployees()[0]?.id||'';
  openModal(id?'تعديل طلب الإجازة':'طلب إجازة جديد',`<form id="leaveForm" class="form-grid"><div class="field"><label>الموظف</label><select class="select" name="employeeId" ${!canManage()?'disabled':''} onchange="refreshLeaveTypeOptions()">${visibleEmployees().map(e=>`<option value="${e.id}" ${e.id===selectedEmployee?'selected':''}>${escapeHTML(e.name)}</option>`).join('')}</select></div><div class="field"><label>نوع الإجازة</label><select class="select" name="leaveTypeId" onchange="updateLeaveBalanceHint()">${leaveTypeOptions(x?.leaveTypeId||x?.type||'',selectedEmployee)}</select><div class="help" id="leaveBalanceHint"></div></div>${field('من تاريخ','from',x?.from||todayISO(),'date',true)}${field('إلى تاريخ','to',x?.to||todayISO(),'date',true)}<div class="field full"><label>السبب</label><textarea class="textarea" name="reason" rows="3" required>${escapeHTML(x?.reason||'')}</textarea></div></form>`,()=>saveLeave(id),id?'حفظ التعديل':'إرسال الطلب');updateLeaveBalanceHint()
}
function refreshLeaveTypeOptions(){const f=$('#leaveForm'),empId=f?.elements.employeeId?.value||currentUser.employeeId,sel=f?.elements.leaveTypeId;if(sel)sel.innerHTML=leaveTypeOptions('',empId);updateLeaveBalanceHint()}
function updateLeaveBalanceHint(){const f=$('#leaveForm'),empId=f?.elements.employeeId?.value||currentUser.employeeId,t=leaveTypeInfo(f?.elements.leaveTypeId?.value),el=$('#leaveBalanceHint');if(el)el.textContent=t.annualDays?`الرصيد السنوي ${t.annualDays} يوم — المتبقي حاليًا ${leaveBalance(empId,t.id)} يوم`:'هذا النوع بلا حد سنوي محدد'}
function saveLeave(id=''){const form=$('#leaveForm'),fd=new FormData(form),o=Object.fromEntries(fd.entries());if(!o.employeeId)o.employeeId=currentUser.employeeId;const a=new Date(o.from),b=new Date(o.to);o.days=Math.floor((b-a)/86400000)+1;if(o.days<1)return toast('الفترة غير صحيحة','error');const t=leaveTypeInfo(o.leaveTypeId),existing=id?state.leaves.find(x=>x.id===id):null,available=t.annualDays?leaveBalance(o.employeeId,t.id)+(existing&&existing.status!=='rejected'&&(existing.leaveTypeId===t.id||existing.type===t.name)?Number(existing.days||0):0):0;if(t.annualDays&&o.days>available)return toast('عدد الأيام أكبر من الرصيد المتبقي','error');o.type=t.name;o.paid=t.paid;if(existing){Object.assign(existing,o,{updatedAt:new Date().toISOString()});logAudit('تعديل إجازة','الإجازات',`${emp(o.employeeId)?.name||''} — ${o.type} — ${o.days} يوم`)}else{state.leaves.push({id:uid('l'),...o,status:'pending',createdAt:new Date().toISOString()});logAudit('طلب إجازة','الإجازات',`${emp(o.employeeId)?.name||''} — ${o.type} — ${o.days} يوم`)}saveState();closeModal();render();toast(existing?'تم تعديل طلب الإجازة':'تم إرسال طلب الإجازة')}
function setRequestStatus(type,id,status){const arr=type==='leave'?state.leaves:state.missions;const x=arr.find(x=>x.id===id);if(x)x.status=status;saveState();render();toast(status==='approved'?'تم قبول الطلب':'تم رفض الطلب')}
function deleteRequest(type,id){const key=type==='leave'?'leaves':'missions';state[key]=state[key].filter(x=>x.id!==id);saveState();render();toast('تم إلغاء الطلب')}

function renderShifts(){return `<div class="page-head"><div><h2>الورديات والجداول</h2><p>إنشاء ورديات حسب أيام الأسبوع، مع تحديد بداية ونهاية ساعات العمل لكل يوم بصورة مستقلة.</p></div>${canAdmin()?'<button class="btn btn-primary" onclick="shiftModal()">＋ وردية جديدة</button>':''}</div><div class="grid grid-3">${state.shifts.map(s=>`<div class="card shift-card"><div class="card-title"><div><h3>${escapeHTML(s.name)}</h3><div class="small muted">${escapeHTML(shiftDaysSummary(s))}</div></div><span class="badge badge-info">${state.employees.filter(e=>e.shiftId===s.id).length} موظف</span></div><div class="shift-week-list">${WEEK_DAYS.map(d=>{const r=s.daySchedules?.[d.id];return `<div class="shift-week-row ${r?.enabled?'active':'off'}"><span>${d.name}</span>${r?.enabled?`<strong>${r.start} — ${r.end}</strong>`:'<em>راحة</em>'}</div>`}).join('')}</div><div class="shift-card-summary"><span>الساعات الأسبوعية</span><strong>${(shiftWeeklyMinutes(s)/60).toFixed(1)} ساعة</strong><span>فترة السماح</span><strong>${Number(s.grace||0)} دقيقة</strong></div>${canAdmin()?`<div class="actions" style="margin-top:15px"><button class="btn btn-secondary btn-sm" onclick="shiftModal('${s.id}')">تعديل</button><button class="btn btn-danger btn-sm" onclick="deleteShift('${s.id}')">حذف</button></div>`:''}</div>`).join('')}</div>`}
function shiftModal(id=''){const existing=id?shift(id):null,s=existing||{name:'',start:'09:00',end:'17:00',grace:15,daySchedules:{}};const rows=WEEK_DAYS.map(d=>{const r=s.daySchedules?.[d.id]||{enabled:['0','1','2','3','4'].includes(d.id),start:s.start||'09:00',end:s.end||'17:00'};return `<div class="shift-day-editor ${r.enabled?'enabled':''}" id="shiftDayRow${d.id}"><label class="shift-day-check"><input type="checkbox" name="day_${d.id}_enabled" ${r.enabled?'checked':''} onchange="toggleShiftDayInputs('${d.id}')"><span>${d.name}</span></label><div class="field"><label>من</label><input class="input" name="day_${d.id}_start" type="time" value="${escapeHTML(r.start)}" ${r.enabled?'':'disabled'} required></div><div class="field"><label>إلى</label><input class="input" name="day_${d.id}_end" type="time" value="${escapeHTML(r.end)}" ${r.enabled?'':'disabled'} required></div><span class="shift-day-state">${r.enabled?'يوم عمل':'راحة'}</span></div>`}).join('');openModal(id?'تعديل الوردية':'وردية جديدة',`<form id="shiftForm" class="form-grid">${field('اسم الوردية','name',s.name,'text',true)}${field('فترة السماح بالدقائق','grace',s.grace,'number',true)}<div class="field full"><label>أيام وساعات العمل</label><div class="shift-days-editor">${rows}</div><div class="help">يمكن تحديد ساعات مختلفة لكل يوم، كما تدعم الوردية التي تنتهي بعد منتصف الليل.</div></div></form>`,()=>saveShift(id))}
function toggleShiftDayInputs(day){const row=$(`#shiftDayRow${day}`),check=row?.querySelector('input[type=checkbox]'),inputs=row?.querySelectorAll('input[type=time]'),stateEl=row?.querySelector('.shift-day-state');inputs?.forEach(i=>i.disabled=!check.checked);row?.classList.toggle('enabled',check.checked);if(stateEl)stateEl.textContent=check.checked?'يوم عمل':'راحة'}
function saveShift(id){const form=$('#shiftForm');if(!form?.reportValidity())return;const fd=new FormData(form),name=String(fd.get('name')||'').trim(),grace=Number(fd.get('grace')||0),daySchedules={},workDays=[];if(!name)return toast('اكتب اسم الوردية','error');for(const d of WEEK_DAYS){const enabled=fd.has(`day_${d.id}_enabled`),start=String(fd.get(`day_${d.id}_start`)||''),end=String(fd.get(`day_${d.id}_end`)||'');daySchedules[d.id]={enabled,start:start||'09:00',end:end||'17:00'};if(enabled){if(!start||!end)return toast(`حدد ساعات يوم ${d.name}`,'error');if(start===end)return toast(`وقت البداية والنهاية متساويان في يوم ${d.name}`,'error');workDays.push(d.id)}}if(!workDays.length)return toast('اختر يوم عمل واحدًا على الأقل','error');const first=daySchedules[workDays[0]],o={name,grace,workDays,daySchedules,start:first.start,end:first.end};if(id)Object.assign(shift(id),o);else state.shifts.push({id:uid('s'),...o});logAudit(id?'تعديل وردية':'إضافة وردية','الورديات',name);saveState();closeModal();render();toast('تم حفظ الوردية وأيام العمل')}
function deleteShift(id){if(state.employees.some(e=>e.shiftId===id))return toast('لا يمكن حذف وردية مرتبطة بموظفين','error');if(confirm('حذف الوردية؟')){state.shifts=state.shifts.filter(s=>s.id!==id);saveState();render()}}

function renderMissions(){const ids=visibleEmployees().map(e=>e.id),list=state.missions.filter(m=>ids.includes(m.employeeId)).sort((a,b)=>b.date.localeCompare(a.date));return `<div class="page-head"><div><h2>المأموريات</h2><p>تنظيم الزيارات الخارجية ومواعيدها ومواقعها.</p></div><button class="btn btn-primary" onclick="missionModal()">＋ طلب مأمورية</button></div><div class="card">${requestTable(list,'mission')}</div>`}
function missionModal(){openModal('طلب مأمورية',`<form id="missionForm" class="form-grid"><div class="field"><label>الموظف</label><select class="select" name="employeeId" ${!canManage()?'disabled':''}>${visibleEmployees().map(e=>`<option value="${e.id}" ${e.id===currentUser.employeeId?'selected':''}>${escapeHTML(e.name)}</option>`).join('')}</select></div>${field('عنوان المأمورية','title','','text',true)}${field('التاريخ','date',todayISO(),'date',true)}${field('من الساعة','from','10:00','time',true)}${field('إلى الساعة','to','14:00','time',true)}${field('الموقع','location','','text',true)}<div class="field full"><label>ملاحظات</label><textarea class="textarea" name="notes" rows="3"></textarea></div></form>`,saveMission)}
function saveMission(){const o=Object.fromEntries(new FormData($('#missionForm')).entries());if(!o.employeeId)o.employeeId=currentUser.employeeId;state.missions.push({id:uid('m'),...o,status:'pending'});saveState();closeModal();render();toast('تم إرسال طلب المأمورية')}

function renderExpenses(){
  const list=[...state.expenses].sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  const linked=list.filter(x=>x.custodyId);
  return `<div class="page-head"><div><h2>مصروفات الشركة</h2><p>تسجيل المصروفات التشغيلية لكل فرع، مع إمكانية ربط المصروف بعهدة مالية ومتابعة الرصيد المتبقي.</p></div><button class="btn btn-primary" onclick="expenseModal()">＋ إضافة مصروف شركة</button></div>
  <div class="grid grid-4">${metric('▣',expenseMoneySummary(list),'إجمالي المصروفات','كل الحالات')}${metric('⌛',expenseMoneySummary(list,'pending'),'قيد المراجعة','تحتاج اعتماد')}${metric('✓',expenseMoneySummary(list,'approved'),'المعتمد','جاهز للتقارير')}${metric('🔗',linked.length,'مصروفات مرتبطة بعهد','الربط المالي')}</div>
  <div class="card" style="margin-top:18px"><div class="card-title"><div><h3>سجل مصروفات الشركة</h3><div class="small muted" style="margin-top:5px">عملة المصروف تُحدد تلقائيًا من الفرع، والعهدة المالية تُخصم بعد اعتماد المصروف.</div></div><div class="actions"><button class="btn btn-secondary btn-sm" onclick="exportExpensesCSV()">⇩ تصدير CSV</button></div></div>
  <div class="table-wrap"><table class="table expense-table"><thead><tr><th>التاريخ</th><th>اسم المصروف</th><th>الفرع</th><th>الفئة</th><th>العهدة المالية</th><th>المورد / الجهة</th><th>طريقة الدفع</th><th>رقم الفاتورة</th><th>الوصف</th><th>المبلغ</th><th>المرفق</th><th>الحالة</th><th>إجراءات</th></tr></thead><tbody>${list.map(x=>`<tr data-record-id="${x.id}" data-status="${escapeHTML(x.status||'')}"><td>${fmtDate(x.date)}</td><td><strong class="expense-title-cell">${escapeHTML(x.title||'مصروف شركة')}</strong></td><td><strong>${escapeHTML(expenseBranch(x)||'-')}</strong><div class="small muted">${escapeHTML(currencyLabel(expenseCurrency(x)))} (${expenseCurrency(x)})</div></td><td>${escapeHTML(x.category||'-')}</td><td>${x.custodyId?`<button class="link-btn" onclick="goToCustody('${x.custodyId}')">${escapeHTML(expenseCustodyLabel(x))}</button>`:'<span class="muted">بدون عهدة</span>'}</td><td>${escapeHTML(x.supplier||'-')}</td><td>${escapeHTML(x.paymentMethod||'-')}</td><td>${escapeHTML(x.invoiceNo||'-')}</td><td>${escapeHTML(x.description||'-')}</td><td><strong>${moneyForExpense(x)}</strong></td><td>${expenseAttachmentCell(x)}</td><td>${statusBadge(x.status)}</td><td><div class="actions"><button class="btn btn-secondary btn-sm" onclick="viewExpense('${x.id}')">عرض</button><button class="btn btn-secondary btn-sm" onclick="expenseModal('${x.id}')">تعديل</button>${x.status==='pending'?`<button class="btn btn-success btn-sm" onclick="expenseStatus('${x.id}','approved')">اعتماد</button><button class="btn btn-danger btn-sm" onclick="expenseStatus('${x.id}','rejected')">رفض</button>`:''}<button class="btn btn-danger btn-sm" onclick="deleteExpense('${x.id}')">حذف</button></div></td></tr>`).join('')||`<tr><td colspan="13">${noReportData('لا توجد مصروفات مسجلة')}</td></tr>`}</tbody></table></div></div>`;
}
function expenseAttachmentCell(x){
  if(x.attachmentData){
    const isImage=String(x.attachmentType||'').startsWith('image/');
    return `<div class="expense-attachment-cell">${isImage?`<button class="receipt-thumb" onclick="openExpenseAttachment('${x.id}')" title="فتح المرفق"><img src="${escapeHTML(x.attachmentData)}" alt="إيصال"></button>`:`<span class="file-icon">📄</span>`}<div><strong>${escapeHTML(x.attachmentName||'مرفق')}</strong><div class="actions" style="margin-top:5px"><button class="link-btn" onclick="openExpenseAttachment('${x.id}')">فتح</button><button class="link-btn" onclick="downloadExpenseAttachment('${x.id}')">تحميل</button></div></div></div>`;
  }
  if(x.attachmentName)return `<span class="badge badge-neutral">📎 ${escapeHTML(x.attachmentName)}</span>`;
  return '<span class="muted">بدون مرفق</span>';
}
function expenseModal(id='',prefillCustodyId=''){
  const x=id?state.expenses.find(v=>v.id===id):null,prefillCustody=!id&&prefillCustodyId?custodyById(prefillCustodyId):null;
  pendingExpenseAttachment=x?.attachmentName?{name:x.attachmentName,type:x.attachmentType,data:x.attachmentData||'',size:x.attachmentSize||0}:null;
  const branch=x?.branch||custodyBranch(prefillCustody)||getBranches()[0]||'',selectedCustodyId=x?.custodyId||prefillCustodyId||'';
  openModal(id?'تعديل مصروف الشركة':'إضافة مصروف شركة',`<form id="expenseForm" class="form-grid">
    <div class="field full"><label>اسم المصروف</label><input class="input" name="title" type="text" value="${escapeHTML(x?.title||'')}" placeholder="مثال: إيجار مكتب شهر يوليو" required maxlength="120"><div class="help">اسم مختصر وواضح يظهر في السجل والتقارير.</div></div>
    <div class="field"><label>الفرع</label><select class="select" name="branch" required onchange="updateExpenseBranchFields(this.value,'${escapeHTML(x?.id||'')}')">${getBranches().map(b=>`<option value="${escapeHTML(b)}" ${b===branch?'selected':''}>${escapeHTML(b)}</option>`).join('')}</select><div class="help" id="expenseCurrencyHint">عملة الفرع: ${branchCurrencyLabel(branch)}</div></div>
    ${field('التاريخ','date',x?.date||todayISO(),'date',true)}
    <div class="field"><label>فئة المصروف</label><select class="select" name="category" required>${expenseCategoryOptions(x?.category||getExpenseCategories()[0]||'')}</select><div class="help">تُدار الفئات من إعدادات النظام.</div></div>
    <div class="field"><label>العهدة المالية المرتبطة</label><select class="select" id="expenseCustodyId" name="custodyId">${financialCustodyOptions(branch,selectedCustodyId,x?.id||'')}</select><div class="help">اختياري. المصروف المعتمد يُخصم من رصيد العهدة، والمعلق يُحجز من المتاح.</div></div>
    ${field('المورد / الجهة','supplier',x?.supplier||'','text',false)}
    <div class="field"><label>طريقة الدفع</label><select class="select" name="paymentMethod"><option ${x?.paymentMethod==='نقدي'?'selected':''}>نقدي</option><option ${x?.paymentMethod==='تحويل بنكي'?'selected':''}>تحويل بنكي</option><option ${x?.paymentMethod==='بطاقة بنكية'?'selected':''}>بطاقة بنكية</option><option ${x?.paymentMethod==='شيك'?'selected':''}>شيك</option><option ${x?.paymentMethod==='آجل'?'selected':''}>آجل</option></select></div>
    ${field('رقم الفاتورة / المرجع','invoiceNo',x?.invoiceNo||'','text',false)}
    <div class="field"><label>المبلغ</label><input class="input" name="amount" type="number" min="0" step="0.01" value="${Number(x?.amount||0)}" required></div>
    <div class="field full"><label>البيان / الوصف</label><textarea class="textarea" name="description" rows="3" required>${escapeHTML(x?.description||'')}</textarea></div>
    <div class="field full"><label>صورة الإيصال أو الملف</label><div class="expense-upload-box"><input class="input" id="expenseAttachmentInput" type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" onchange="handleExpenseAttachment(this)"><div class="help">يدعم الصور وPDF وWord وExcel والنصوص. تُضغط الصور تلقائيًا، والحد الأقصى للملفات 2 ميجابايت.</div><div id="expenseAttachmentPreview">${expenseAttachmentPreviewHTML()}</div></div></div>
  </form>`,()=>saveExpense(id),id?'حفظ التعديل':'حفظ المصروف');
}
function updateExpenseCurrencyHint(branch){updateExpenseBranchFields(branch,'')}
function updateExpenseBranchFields(branch,expenseId=''){const el=$('#expenseCurrencyHint');if(el)el.textContent=`عملة الفرع: ${branchCurrencyLabel(branch)}`;const select=$('#expenseCustodyId');if(select){const current=select.value;select.innerHTML=financialCustodyOptions(branch,current,expenseId);if(current&&![...select.options].some(o=>o.value===current))select.value=''}}
function expenseAttachmentPreviewHTML(){
  if(!pendingExpenseAttachment)return '<div class="attachment-empty">لم يتم اختيار مرفق</div>';
  const isImage=String(pendingExpenseAttachment.type||'').startsWith('image/');
  return `<div class="attachment-preview">${isImage&&pendingExpenseAttachment.data?`<img src="${escapeHTML(pendingExpenseAttachment.data)}" alt="معاينة الإيصال">`:'<div class="attachment-doc-icon">📄</div>'}<div><strong>${escapeHTML(pendingExpenseAttachment.name||'مرفق')}</strong><small>${pendingExpenseAttachment.size?formatFileSize(pendingExpenseAttachment.size):'ملف محفوظ'}</small></div><button class="btn btn-danger btn-sm" type="button" onclick="removeExpenseAttachment()">إزالة</button></div>`;
}
function formatFileSize(bytes){const n=Number(bytes||0);if(!n)return '';if(n<1024)return `${n} بايت`;if(n<1024*1024)return `${(n/1024).toFixed(1)} كيلوبايت`;return `${(n/1024/1024).toFixed(1)} ميجابايت`}
function removeExpenseAttachment(){pendingExpenseAttachment=null;const el=$('#expenseAttachmentPreview');if(el)el.innerHTML=expenseAttachmentPreviewHTML();const input=$('#expenseAttachmentInput');if(input)input.value=''}
function isImageFile(file){return String(file?.type||'').startsWith('image/')||/\.(png|jpe?g|webp|gif|bmp)$/i.test(file?.name||'')}
async function handleExpenseAttachment(input){
  const file=input.files?.[0];if(!file)return;
  const extOk=/\.(png|jpe?g|webp|gif|bmp|pdf|docx?|xlsx?|txt)$/i.test(file.name||'');
  const mimeOk=isImageFile(file)||['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','text/plain'].includes(file.type);
  if(!mimeOk&&!extOk){input.value='';return toast('نوع الملف غير مدعوم','error')}
  try{
    const prepared=await prepareExpenseAttachment(file);
    pendingExpenseAttachment=prepared;
    const el=$('#expenseAttachmentPreview');if(el)el.innerHTML=expenseAttachmentPreviewHTML();
    toast('تم تجهيز المرفق للحفظ');
  }catch(err){input.value='';toast(err?.message||'تعذر قراءة المرفق','error')}
}
function prepareExpenseAttachment(file){
  if(isImageFile(file))return resizeReceiptImage(file);
  if(file.size>2*1024*1024)return Promise.reject(new Error('حجم الملف أكبر من 2 ميجابايت'));
  return readFileAsDataURL(file).then(data=>({name:file.name,type:file.type||'application/octet-stream',size:file.size,data}));
}
function resizeReceiptImage(file,maxSize=1600){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();reader.onerror=()=>reject(new Error('تعذر قراءة الصورة'));reader.onload=()=>{
      const image=new Image();image.onerror=()=>reject(new Error('ملف الصورة غير صالح'));image.onload=()=>{
        const scale=Math.min(1,maxSize/image.width,maxSize/image.height),width=Math.max(1,Math.round(image.width*scale)),height=Math.max(1,Math.round(image.height*scale));
        const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);ctx.drawImage(image,0,0,width,height);
        const data=canvas.toDataURL('image/jpeg',.82);if(data.length>3*1024*1024)return reject(new Error('الصورة كبيرة جدًا حتى بعد الضغط'));
        resolve({name:(file.name||'receipt').replace(/\.[^.]+$/,'.jpg'),type:'image/jpeg',size:Math.round(data.length*0.75),data});
      };image.src=reader.result;
    };reader.readAsDataURL(file);
  });
}
function readFileAsDataURL(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onerror=()=>reject(new Error('تعذر قراءة الملف'));r.onload=()=>resolve(r.result);r.readAsDataURL(file)})}
function validateExpenseCustody(o,id=''){
  o.custodyId=String(o.custodyId||'').trim();if(!o.custodyId)return true;
  const c=custodyById(o.custodyId);if(!c||c.custodyType!=='financial'){toast('العهدة المالية المختارة غير موجودة','error');return false}
  if(custodyBranch(c)!==o.branch){toast('فرع المصروف مختلف عن فرع العهدة المالية','error');return false}
  if(c.status!=='assigned'){
    const existing=state.expenses.find(x=>x.id===id);
    if(!existing||existing.custodyId!==c.id){toast('لا يمكن ربط مصروف بعهدة تمت تسويتها','error');return false}
    if(Number(o.amount||0)!==Number(existing.amount||0)||o.branch!==existing.branch){toast('لا يمكن تغيير مبلغ أو فرع مصروف مرتبط بعهدة تمت تسويتها','error');return false}
  }
  const available=custodyRemaining(c,id);if(Number(o.amount||0)>available+.001){toast(`المبلغ أكبر من رصيد العهدة المتاح: ${money(available,custodyCurrency(c))}`,'error');return false}
  return true;
}
function saveExpense(id=''){
  const form=$('#expenseForm');if(!form?.reportValidity())return;
  const o=Object.fromEntries(new FormData(form).entries());o.title=String(o.title||'').trim();o.amount=Number(o.amount||0);o.currency=getBranchCurrency(o.branch);
  if(!o.title)return toast('اكتب اسم المصروف','error');
  if(o.amount<=0)return toast('أدخل مبلغًا أكبر من صفر','error');
  if(!validateExpenseCustody(o,id))return;
  const attachment=pendingExpenseAttachment||{};
  const payload={...o,attachmentName:attachment.name||'',attachmentType:attachment.type||'',attachmentSize:attachment.size||0,attachmentData:attachment.data||'',updatedAt:new Date().toISOString()};
  try{
    if(id){const x=state.expenses.find(v=>v.id===id);if(!x)return;Object.assign(x,payload)}
    else state.expenses.push({id:uid('x'),...payload,status:'pending',createdBy:currentUser.id,createdAt:new Date().toISOString()});
    const linked=payload.custodyId?` — عهدة: ${custodyById(payload.custodyId)?.item||''}`:'';
    logAudit(id?'تعديل مصروف':'إضافة مصروف','مصروفات الشركة',`${payload.title} — ${money(payload.amount,payload.currency)}${linked}`);saveState();closeModal();render();toast(id?'تم تحديث المصروف':'تمت إضافة مصروف الشركة');
  }catch(err){toast('تعذر الحفظ؛ قد تكون مساحة المتصفح ممتلئة بسبب حجم المرفق','error')}
}
function expenseStatus(id,status){const x=state.expenses.find(x=>x.id===id);if(!x)return;if(status==='approved'&&x.custodyId&&!validateExpenseCustody({...x},id))return;x.status=status;x.updatedAt=new Date().toISOString();logAudit(status==='approved'?'اعتماد مصروف':'رفض مصروف','مصروفات الشركة',`${x.title||x.id}${x.custodyId?' — خُصم من العهدة':''}`);saveState();render();toast(status==='approved'?'تم اعتماد المصروف وتحديث رصيد العهدة':'تم رفض المصروف')}
function deleteExpense(id){if(!confirm('حذف مصروف الشركة والمرفق المرتبط به؟ سيتم تحديث رصيد العهدة إن كان المصروف مرتبطًا بها.'))return;const x=state.expenses.find(v=>v.id===id);state.expenses=state.expenses.filter(x=>x.id!==id);logAudit('حذف مصروف','مصروفات الشركة',x?.title||id);saveState();render();toast('تم حذف المصروف وتحديث رصيد العهدة')}
function viewExpense(id){const x=state.expenses.find(v=>v.id===id);if(!x)return;const c=expenseCustody(x);openModal('تفاصيل مصروف الشركة',`<div class="record-view"><div class="record-view-title"><strong>${escapeHTML(x.title||'مصروف شركة')}</strong>${statusBadge(x.status)}</div><div class="record-view-grid"><div><span>اسم المصروف</span><strong>${escapeHTML(x.title||'-')}</strong></div><div><span>التاريخ</span><strong>${fmtDate(x.date)}</strong></div><div><span>الفرع والعملة</span><strong>${escapeHTML(expenseBranch(x))} · ${escapeHTML(currencyLabel(expenseCurrency(x)))} (${expenseCurrency(x)})</strong></div><div><span>العهدة المالية</span><strong>${c?escapeHTML(expenseCustodyLabel(x)):'بدون عهدة'}</strong></div><div><span>المورد / الجهة</span><strong>${escapeHTML(x.supplier||'-')}</strong></div><div><span>طريقة الدفع</span><strong>${escapeHTML(x.paymentMethod||'-')}</strong></div><div><span>رقم الفاتورة</span><strong>${escapeHTML(x.invoiceNo||'-')}</strong></div><div><span>المبلغ</span><strong>${moneyForExpense(x)}</strong></div>${c?`<div><span>رصيد العهدة الحالي</span><strong>${money(custodyRemaining(c),custodyCurrency(c))}</strong></div>`:''}<div class="full"><span>الوصف</span><strong>${escapeHTML(x.description||'-')}</strong></div><div class="full"><span>المرفق</span>${expenseAttachmentCell(x)}</div></div></div>`)}
function dataURLToBlob(dataURL){const [head,body]=String(dataURL).split(','),mime=(head.match(/data:([^;]+)/)||[])[1]||'application/octet-stream',bin=atob(body||''),arr=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);return new Blob([arr],{type:mime})}
function openExpenseAttachment(id){const x=state.expenses.find(v=>v.id===id);if(!x?.attachmentData)return toast('لا يوجد ملف محفوظ يمكن فتحه','error');const blob=dataURLToBlob(x.attachmentData),url=URL.createObjectURL(blob);if(String(x.attachmentType||'').startsWith('image/')||x.attachmentType==='application/pdf'){window.open(url,'_blank','noopener');setTimeout(()=>URL.revokeObjectURL(url),60000)}else{downloadExpenseAttachment(id);URL.revokeObjectURL(url)}}
function downloadExpenseAttachment(id){const x=state.expenses.find(v=>v.id===id);if(!x?.attachmentData)return toast('لا يوجد ملف محفوظ للتحميل','error');const blob=dataURLToBlob(x.attachmentData),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=x.attachmentName||'expense-attachment';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function exportExpensesCSV(){const rows=state.expenses.map(x=>[x.date,x.title||'',expenseBranch(x),x.category||'',expenseCustodyLabel(x),x.supplier||'',x.paymentMethod||'',x.invoiceNo||'',x.description||'',x.amount,expenseCurrency(x),statusText(x.status),x.attachmentName||'']);downloadCSV(`orbit-company-expenses-${todayISO()}.csv`,['التاريخ','اسم المصروف','الفرع','الفئة','العهدة المالية','المورد / الجهة','طريقة الدفع','رقم الفاتورة','الوصف','المبلغ','العملة','الحالة','المرفق'],rows)}

function adjustmentKindLabel(kind){return kind==='reward'?'مكافأة':'خصم'}
function adjustmentMethodLabel(x){
  if(x.kind!=='deduction')return 'مبلغ ثابت';
  if(x.calculationMethod==='days')return `${Number(x.days||0)} يوم × ${moneyForEmployee(x.dailyRate||0,x.employeeId)}`;
  return 'مبلغ ثابت';
}
function adjustmentTypeLabel(x){return x.kind==='reward'?(x.rewardType||'أخرى'):(x.deductionType||'أخرى')}
function deductionTypeLabel(x){return x.kind==='deduction'?(x.deductionType||'أخرى'):'—'}
function deductionByDays(employeeId,date,days){
  const e=emp(employeeId),month=String(date||monthISO()).slice(0,7),workDays=Math.max(1,countScheduledShiftDays(e?.shiftId,month)||Number(state.settings.workDays||26)),dailyRate=Number(e?.salary||0)/workDays,amount=dailyRate*Math.max(0,Number(days||0));
  return {workDays,dailyRate,amount,month};
}
function renderAdjustments(){
  const ids=visibleEmployees().map(e=>e.id),list=state.adjustments.filter(x=>ids.includes(x.employeeId)).sort((a,b)=>b.date.localeCompare(a.date));
  const rewards=list.filter(x=>x.kind==='reward'),deductions=list.filter(x=>x.kind==='deduction');
  return `<div class="page-head"><div><h2>الخصومات والمكافآت</h2><p>إدارة أنواع الخصومات والمكافآت، مع احتساب الخصم كمبلغ ثابت أو بعدد أيام من أجر الموظف.</p></div>${canManage()?'<button class="btn btn-primary" onclick="adjustmentModal()">＋ إضافة حركة مالية</button>':''}</div>
  <div class="grid grid-4">${metric('＋',moneySummary(rewards.filter(x=>x.status==='approved')),'مكافآت معتمدة','مفصولة حسب العملة')}${metric('−',moneySummary(deductions.filter(x=>x.status==='approved')),'خصومات معتمدة','ثابتة أو محسوبة بالأيام')}${metric('⌛',list.filter(x=>x.status==='pending').length,'حركات معلقة','بانتظار القرار')}${metric('▤',list.length,'إجمالي الحركات','كل الحالات')}</div>
  <div class="card" style="margin-top:18px">${list.length?`<div class="table-wrap"><table class="table"><thead><tr><th>الموظف</th><th>التاريخ</th><th>الحركة</th><th>نوع الخصم / المكافأة</th><th>طريقة الحساب</th><th>السبب</th><th>المبلغ</th><th>الحالة</th><th>إجراءات</th></tr></thead><tbody>${list.map(x=>`<tr data-record-id="${x.id}" data-status="${escapeHTML(x.status||'')}"><td>${escapeHTML(emp(x.employeeId)?.name||'-')}<div class="small muted">${escapeHTML(emp(x.employeeId)?.branch||'-')}</div></td><td>${fmtDate(x.date)}</td><td><span class="badge badge-${x.kind==='reward'?'success':'danger'}">${adjustmentKindLabel(x.kind)}</span></td><td>${escapeHTML(adjustmentTypeLabel(x))}</td><td>${escapeHTML(adjustmentMethodLabel(x))}</td><td>${escapeHTML(x.reason)}</td><td><strong>${x.kind==='reward'?'+':'−'} ${moneyForEmployee(x.amount,x.employeeId)}</strong></td><td>${statusBadge(x.status)}</td><td><div class="actions">${canManage()&&x.status==='pending'?`<button class="btn btn-success btn-sm" onclick="adjustmentStatus('${x.id}','approved')">اعتماد</button><button class="btn btn-danger btn-sm" onclick="adjustmentStatus('${x.id}','rejected')">رفض</button>`:''}${canManage()?`<button class="btn btn-secondary btn-sm" onclick="adjustmentModal('${x.id}')">تعديل</button>`:''}${canAdmin()?`<button class="btn btn-danger btn-sm" onclick="deleteAdjustment('${x.id}')">حذف</button>`:''}</div></td></tr>`).join('')}</tbody></table></div>`:`<div class="empty"><span class="emoji">±</span>لا توجد خصومات أو مكافآت</div>`}</div>`;
}
function adjustmentModal(id=''){
  const x=id?state.adjustments.find(x=>x.id===id):{employeeId:visibleEmployees()[0]?.id||'',date:todayISO(),kind:'deduction',deductionType:getDeductionTypes()[0]||'أخرى',rewardType:getRewardTypes()[0]||'أخرى',calculationMethod:'fixed',days:1,amount:0,reason:'',status:'pending'};
  openModal(id?'تعديل الحركة المالية':'إضافة حركة مالية',`<form id="adjustmentForm" class="form-grid"><div class="field"><label>الموظف</label><select class="select" name="employeeId" onchange="syncAdjustmentFields()">${visibleEmployees().map(e=>`<option value="${e.id}" ${e.id===x.employeeId?'selected':''}>${escapeHTML(e.name)} — ${escapeHTML(e.branch)}</option>`).join('')}</select></div>${field('التاريخ','date',x.date,'date',true).replace('<input','<input onchange="syncAdjustmentFields()"')}<div class="field"><label>نوع الحركة</label><select class="select" name="kind" onchange="syncAdjustmentFields()"><option value="deduction" ${x.kind==='deduction'?'selected':''}>خصم</option><option value="reward" ${x.kind==='reward'?'selected':''}>مكافأة</option></select></div><div class="field adjustment-deduction-only"><label>نوع الخصم</label><select class="select" name="deductionType" required>${deductionTypeOptions(x.deductionType)}</select><div class="help">تظهر الأنواع المضافة من إعدادات النظام.</div></div><div class="field adjustment-reward-only"><label>نوع المكافأة</label><select class="select" name="rewardType" required>${rewardTypeOptions(x.rewardType)}</select><div class="help">تظهر الأنواع المضافة من إعدادات النظام.</div></div><div class="field adjustment-deduction-only"><label>طريقة الخصم</label><select class="select" name="calculationMethod" onchange="syncAdjustmentFields()"><option value="fixed" ${x.calculationMethod!=='days'?'selected':''}>مبلغ ثابت</option><option value="days" ${x.calculationMethod==='days'?'selected':''}>حسب عدد الأيام</option></select></div><div class="field adjustment-fixed-field"><label>المبلغ</label><input class="input" name="amount" type="number" min="0.01" step="0.01" value="${Number(x.amount||0)}" required></div><div class="field adjustment-days-field"><label>عدد أيام الخصم</label><input class="input" name="days" type="number" min="0.5" step="0.5" value="${Number(x.days||1)}" oninput="updateAdjustmentPreview()"></div><div class="field full adjustment-days-field"><div id="adjustmentDaysPreview" class="adjustment-calc-preview"></div></div><div class="field full"><label>السبب / البيان</label><textarea class="textarea" name="reason" rows="3" required>${escapeHTML(x.reason||'')}</textarea></div><div class="field"><label>الحالة</label><select class="select" name="status"><option value="pending" ${x.status==='pending'?'selected':''}>قيد المراجعة</option><option value="approved" ${x.status==='approved'?'selected':''}>معتمد</option><option value="rejected" ${x.status==='rejected'?'selected':''}>مرفوض</option></select></div></form>`,()=>saveAdjustment(id));
  syncAdjustmentFields();
}
function syncAdjustmentFields(){
  const form=$('#adjustmentForm');if(!form)return;
  const isDeduction=form.elements.kind.value==='deduction',isDays=isDeduction&&form.elements.calculationMethod.value==='days';
  $$('.adjustment-deduction-only',form).forEach(el=>el.hidden=!isDeduction);
  $$('.adjustment-reward-only',form).forEach(el=>el.hidden=isDeduction);
  $$('.adjustment-days-field',form).forEach(el=>el.hidden=!isDays);
  $$('.adjustment-fixed-field',form).forEach(el=>el.hidden=isDays);
  form.elements.deductionType.disabled=!isDeduction;
  form.elements.rewardType.disabled=isDeduction;
  form.elements.calculationMethod.disabled=!isDeduction;
  form.elements.days.disabled=!isDays;
  form.elements.amount.readOnly=isDays;
  updateAdjustmentPreview();
}
function updateAdjustmentPreview(){
  const form=$('#adjustmentForm'),box=$('#adjustmentDaysPreview');if(!form||!box)return;
  const isDays=form.elements.kind.value==='deduction'&&form.elements.calculationMethod.value==='days';if(!isDays){box.innerHTML='';return}
  const info=deductionByDays(form.elements.employeeId.value,form.elements.date.value,form.elements.days.value),e=emp(form.elements.employeeId.value),c=employeeCurrency(form.elements.employeeId.value);
  form.elements.amount.value=info.amount?info.amount.toFixed(2):'0';
  box.innerHTML=`<div><strong>احتساب الخصم بالأيام</strong><span>${escapeHTML(e?.name||'-')} · راتب ${money(e?.salary||0,c)}</span></div><div class="adjustment-formula"><span>${Number(form.elements.days.value||0)} يوم</span><b>×</b><span>${money(info.dailyRate,c)} أجر يومي</span><b>=</b><strong>${money(info.amount,c)}</strong></div><small>تم احتساب أجر اليوم على ${info.workDays} يوم عمل مجدول في ${info.month}.</small>`;
}
function saveAdjustment(id){
  const form=$('#adjustmentForm');if(!form?.reportValidity())return;
  const o=Object.fromEntries(new FormData(form).entries());o.amount=Number(o.amount);o.days=Number(o.days||0);
  if(o.kind==='deduction'){
    o.deductionType=String(o.deductionType||'').trim();if(!o.deductionType)return toast('اختر نوع الخصم','error');o.rewardType='';
    o.calculationMethod=o.calculationMethod==='days'?'days':'fixed';
    if(o.calculationMethod==='days'){
      if(!o.days||o.days<=0)return toast('اكتب عدد أيام صحيحًا','error');
      const calc=deductionByDays(o.employeeId,o.date,o.days);o.amount=+calc.amount.toFixed(2);o.dailyRate=+calc.dailyRate.toFixed(2);o.workDaysBasis=calc.workDays;
      if(!o.amount)return toast('تعذر احتساب الخصم؛ تأكد من راتب الموظف','error');
    }else{if(!o.amount||o.amount<=0)return toast('اكتب مبلغًا صحيحًا','error');o.days=0;o.dailyRate=0;o.workDaysBasis=0}
  }else{
    o.rewardType=String(o.rewardType||'').trim();if(!o.rewardType)return toast('اختر نوع المكافأة','error');
    if(!o.amount||o.amount<=0)return toast('اكتب مبلغ المكافأة','error');o.deductionType='';o.calculationMethod='fixed';o.days=0;o.dailyRate=0;o.workDaysBasis=0;
  }
  if(id)Object.assign(state.adjustments.find(x=>x.id===id),o,{updatedAt:new Date().toISOString()});else state.adjustments.push({id:uid('adj'),...o,createdAt:new Date().toISOString()});logAudit(id?'تعديل حركة مالية':'إضافة حركة مالية','الخصومات والمكافآت',`${adjustmentKindLabel(o.kind)} — ${emp(o.employeeId)?.name||''} — ${o.amount}`);saveState();closeModal();render();toast('تم حفظ الحركة المالية');
}
function adjustmentStatus(id,status){const x=state.adjustments.find(x=>x.id===id);if(x){x.status=status;x.updatedAt=new Date().toISOString();logAudit(status==='approved'?'اعتماد حركة مالية':'رفض حركة مالية','الخصومات والمكافآت',`${adjustmentKindLabel(x.kind)} — ${emp(x.employeeId)?.name||''} — ${x.amount}`)}saveState();render();toast(status==='approved'?'تم اعتماد الحركة':'تم رفض الحركة')}
function deleteAdjustment(id){if(!confirm('حذف الحركة المالية؟'))return;const x=state.adjustments.find(v=>v.id===id);state.adjustments=state.adjustments.filter(x=>x.id!==id);logAudit('حذف حركة مالية','الخصومات والمكافآت',`${x?adjustmentKindLabel(x.kind):''} — ${x?.amount||''}`);saveState();render();toast('تم الحذف')}

function custodyStatusLabel(status,x=null){if(x?.custodyType==='financial')return {assigned:'مفتوحة',returned:'تمت التسوية',damaged:'تالف',lost:'مفقود'}[status]||status;return {assigned:'بعهدة الموظف',returned:'تم الرد',damaged:'تالف',lost:'مفقود'}[status]||status}
function custodyStatusBadge(x){const label=custodyStatusLabel(x.status,x),cls=x.status==='assigned'?'warning':x.status==='returned'?'success':'danger';return `<span class="badge badge-${cls}">${escapeHTML(label)}</span>`}
function financialCustodySummary(list,mode='remaining'){const totals={};list.filter(x=>x.custodyType==='financial').forEach(x=>{const c=custodyCurrency(x),v=mode==='spent'?custodyApprovedSpent(x):mode==='pending'?custodyPendingSpent(x):mode==='total'?Number(x.value||0):custodyRemaining(x);totals[c]=(totals[c]||0)+v});const entries=Object.entries(totals);return entries.length?entries.map(([c,v])=>money(v,c)).join('<br>'):money(0,state.settings.currency)}
function assetCustodyMoneySummary(list){const totals={};list.filter(x=>x.custodyType!=='financial').forEach(x=>{const c=custodyCurrency(x);totals[c]=(totals[c]||0)+custodyTotalValue(x)});const entries=Object.entries(totals);return entries.length?entries.map(([c,v])=>money(v,c)).join('<br>'):money(0,state.settings.currency)}
function custodyMoneySummary(list){const financial=list.filter(x=>x.custodyType==='financial'),assets=list.filter(x=>x.custodyType!=='financial');const parts=[];if(financial.length)parts.push(`مالية: ${financialCustodySummary(financial,'remaining')}`);if(assets.length)parts.push(`عينية: ${assetCustodyMoneySummary(assets)}`);return parts.length?parts.join('<br>'):money(0,state.settings.currency)}
function custodyRowHTML(x){
  const isFin=x.custodyType==='financial',approved=isFin?custodyApprovedSpent(x):0,pending=isFin?custodyPendingSpent(x):0,remaining=isFin?custodyRemaining(x):custodyTotalValue(x),linked=linkedCustodyExpenses(x.id,['approved','pending','rejected']).length,search=[x.item,x.serial,emp(x.employeeId)?.name,emp(x.employeeId)?.department,custodyBranch(x),custodyTypeLabel(x),custodyStatusLabel(x.status,x)].join(' ').toLowerCase();
  return `<tr id="custody-row-${x.id}" data-record-id="${x.id}" data-custody="1" data-search="${escapeHTML(search)}" data-type="${x.custodyType}" data-branch="${escapeHTML(custodyBranch(x)||'')}" data-status="${x.status}"><td><span class="custody-type-pill ${isFin?'financial':'asset'}">${isFin?'💵':'▦'} ${custodyTypeLabel(x)}</span></td><td><div class="employee-cell">${avatarHTML(emp(x.employeeId)||{name:'-'},34)}<div><strong>${escapeHTML(emp(x.employeeId)?.name||'-')}</strong><div class="small muted">${escapeHTML(emp(x.employeeId)?.department||'-')}</div></div></div></td><td><strong>${escapeHTML(x.item)}</strong><div class="small muted custody-note-cell">${escapeHTML(x.notes||'بدون ملاحظات')}</div>${isFin?`<button class="linked-count" onclick="showCustodyExpenses('${x.id}')">${linked} حركة مصروف مرتبطة</button>`:''}</td><td>${escapeHTML(x.serial||'-')}</td><td>${money(custodyTotalValue(x),custodyCurrency(x))}</td><td>${isFin?money(approved,custodyCurrency(x)):'—'}</td><td>${isFin?money(pending,custodyCurrency(x)):'—'}</td><td><strong class="custody-balance">${money(remaining,custodyCurrency(x))}</strong>${isFin&&x.returnedCash?`<div class="small muted">مرتجع للخزينة: ${money(x.returnedCash,custodyCurrency(x))}</div>`:''}</td><td>${fmtDate(x.assignedDate)}</td><td>${custodyStatusBadge(x)}</td><td><div class="actions custody-actions">${isFin?`<button class="btn btn-secondary btn-sm" onclick="showCustodyExpenses('${x.id}')">عرض المصروفات</button>`:''}${canManage()?`<button class="btn btn-secondary btn-sm" onclick="custodyModal('${x.id}')">تعديل</button>${x.status==='assigned'?(isFin?`<button class="btn btn-success btn-sm" onclick="settleFinancialCustody('${x.id}')">تسوية</button>`:`<button class="btn btn-success btn-sm" onclick="closeCustody('${x.id}','returned')">تم الرد</button><button class="btn btn-danger btn-sm" onclick="closeCustody('${x.id}','damaged')">تالف</button>`):''}`:''}${canAdmin()?`<button class="btn btn-danger btn-sm" onclick="deleteCustody('${x.id}')">حذف</button>`:''}</div></td></tr>`;
}
function custodyBranchGroupHTML(branch,items,index){
  const currency=getBranchCurrency(branch),active=items.filter(x=>x.status==='assigned'),financial=active.filter(x=>x.custodyType==='financial'),assets=active.filter(x=>x.custodyType!=='financial'),totalFinancial=items.filter(x=>x.custodyType==='financial').reduce((s,x)=>s+Number(x.value||0),0),approved=items.filter(x=>x.custodyType==='financial').reduce((s,x)=>s+custodyApprovedSpent(x),0),remaining=items.filter(x=>x.custodyType==='financial').reduce((s,x)=>s+custodyRemaining(x),0),assetValue=items.filter(x=>x.custodyType!=='financial').reduce((s,x)=>s+custodyTotalValue(x),0),bodyId=`custodyBranchBody${index}`;
  return `<article class="custody-branch-group" data-custody-branch-group="1" data-branch="${escapeHTML(branch)}"><header class="custody-branch-head"><div class="custody-branch-title"><span class="custody-branch-icon">⌂</span><div><span class="page-eyebrow">الفرع المستلم</span><h3>${escapeHTML(branch)}</h3><p>${escapeHTML(currencyLabel(currency))} · ${currency}</p></div></div><div class="custody-branch-stats"><span><small>إجمالي السجلات</small><strong class="custody-branch-visible">${items.length}</strong></span><span><small>عهد مالية مفتوحة</small><strong>${financial.length}</strong></span><span><small>عهد عينية نشطة</small><strong>${assets.length}</strong></span><span><small>مبلغ العهد المالية</small><strong>${money(totalFinancial,currency)}</strong></span><span><small>مصروف معتمد</small><strong>${money(approved,currency)}</strong></span><span><small>الرصيد المتاح</small><strong>${money(remaining,currency)}</strong></span>${assetValue?`<span><small>قيمة العهد العينية</small><strong>${money(assetValue,currency)}</strong></span>`:''}</div><button class="custody-branch-toggle" type="button" onclick="toggleCustodyBranchGroup('${bodyId}',this)" aria-expanded="true">⌃</button></header><div class="custody-branch-body" id="${bodyId}"><div class="table-wrap custody-table-wrap"><table class="table custody-table"><thead><tr><th>النوع</th><th>الموظف المسؤول</th><th>بيان العهدة</th><th>الرقم/السيريال</th><th>القيمة الأصلية</th><th>المصروف المعتمد</th><th>المعلّق</th><th>الرصيد / القيمة الحالية</th><th>تاريخ التسليم</th><th>الحالة</th><th>إجراءات</th></tr></thead><tbody>${items.map(custodyRowHTML).join('')}</tbody></table></div></div></article>`;
}
function renderCustody(){
  const ids=visibleEmployees().map(e=>e.id),list=state.custodies.filter(x=>ids.includes(x.employeeId)).sort((a,b)=>String(b.assignedDate).localeCompare(String(a.assignedDate)));
  const active=list.filter(x=>x.status==='assigned'),financial=active.filter(x=>x.custodyType==='financial'),assets=active.filter(x=>x.custodyType!=='financial'),usedBranches=[...new Set(list.map(custodyBranch).filter(Boolean))],branches=[...getBranches().filter(b=>usedBranches.includes(b)),...usedBranches.filter(b=>!getBranches().includes(b))];
  const approvedTotal=financialCustodySummary(financial,'spent'),remainingTotal=financialCustodySummary(financial,'remaining');
  return `<section class="custody-page"><div class="custody-hero"><div class="custody-hero-copy"><span class="page-eyebrow">الأصول والذمم المالية</span><h2>إدارة العُهد حسب الفروع</h2><p>كل فرع يظهر في مجموعة مستقلة تتضمن ملخصًا ماليًا وعدد العهد النشطة والمغلقة، مع استمرار ربط المصروفات من صفحة مصروفات الشركة فقط.</p><div class="custody-hero-badges"><span>✓ فصل واضح لكل فرع</span><span>⌂ فرع مستلم مستقل</span><span>▣ رصيد ومصروفات لحظية</span></div></div>${canManage()?'<button class="btn btn-light btn-hero" onclick="custodyModal()">＋ إضافة عهدة جديدة</button>':''}</div>
  <div class="custody-kpi-grid"><article class="custody-kpi tone-primary"><span class="custody-kpi-icon">💵</span><div><small>العهد المالية المفتوحة</small><strong>${financial.length}</strong><p>الرصيد المتاح: ${remainingTotal}</p></div></article><article class="custody-kpi tone-success"><span class="custody-kpi-icon">▣</span><div><small>مصروفات معتمدة من العهد</small><strong>${approvedTotal}</strong><p>محسوبة من حركات المصروفات فقط</p></div></article><article class="custody-kpi tone-info"><span class="custody-kpi-icon">▦</span><div><small>العهد العينية النشطة</small><strong>${assets.length}</strong><p>${assetCustodyMoneySummary(assets)}</p></div></article><article class="custody-kpi tone-neutral"><span class="custody-kpi-icon">⌂</span><div><small>الفروع التي لديها عهد</small><strong>${branches.length}</strong><p>${list.filter(x=>x.status==='returned').length} عهدة تمت تسويتها أو ردها</p></div></article></div>
  <div class="card custody-workspace"><div class="custody-workspace-head"><div><h3>سجل العُهد مجمّع حسب الفرع</h3><p>استخدم البحث والفلاتر، ثم افتح أو اطوِ كل فرع حسب الحاجة.</p></div><div class="custody-count"><span id="custodyVisibleCount">${list.length}</span> سجل</div></div><div class="custody-toolbar"><div class="custody-search"><span>⌕</span><input class="input" id="custodySearch" placeholder="بحث باسم العهدة أو الموظف أو السيريال" oninput="filterCustodyRows()"></div><select class="select" id="custodyTypeFilter" onchange="filterCustodyRows()"><option value="">كل الأنواع</option><option value="financial">عهد مالية</option><option value="asset">عهد عينية</option></select><select class="select" id="custodyBranchFilter" onchange="filterCustodyRows()"><option value="">كل الفروع</option>${branches.map(b=>`<option value="${escapeHTML(b)}">${escapeHTML(b)}</option>`).join('')}</select><select class="select" id="custodyStatusFilter" onchange="filterCustodyRows()"><option value="">كل الحالات</option><option value="assigned">مفتوحة / نشطة</option><option value="returned">تمت التسوية / الرد</option><option value="damaged">تالف</option><option value="lost">مفقود</option></select><button class="btn btn-secondary" onclick="exportCustodiesCSV()">⇩ تصدير CSV</button></div><div class="custody-branch-directory">${branches.map((b,i)=>custodyBranchGroupHTML(b,list.filter(x=>custodyBranch(x)===b),i)).join('')}</div><div id="custodyEmptyFilter" class="empty hidden"><span class="emoji">⌕</span>لا توجد نتائج مطابقة للفلاتر</div>${!list.length?`<div class="empty"><span class="emoji">▦</span>لا توجد عهد مسجلة</div>`:''}</div></section>`;
}
function toggleCustodyBranchGroup(bodyId,button){const body=document.getElementById(bodyId);if(!body)return;const collapsed=body.classList.toggle('collapsed');button.textContent=collapsed?'⌄':'⌃';button.setAttribute('aria-expanded',String(!collapsed))}
function syncCustodyBranchVisibility(){let total=0;$$('[data-custody-branch-group]').forEach(group=>{const rows=$$('tr[data-custody]',group),visible=rows.filter(r=>r.style.display!=='none'&&!r.classList.contains('section-search-hidden')).length;group.classList.toggle('filter-hidden',visible===0);const badge=$('.custody-branch-visible',group);if(badge)badge.textContent=visible;total+=visible});const count=$('#custodyVisibleCount');if(count)count.textContent=total;$('#custodyEmptyFilter')?.classList.toggle('hidden',total!==0)}
function filterCustodyRows(){const q=String($('#custodySearch')?.value||'').trim().toLowerCase(),type=$('#custodyTypeFilter')?.value||'',branch=$('#custodyBranchFilter')?.value||'',status=$('#custodyStatusFilter')?.value||'';$$('tr[data-custody]').forEach(r=>{const show=(!q||r.dataset.search.includes(q))&&(!type||r.dataset.type===type)&&(!branch||r.dataset.branch===branch)&&(!status||r.dataset.status===status);r.style.display=show?'':'none'});syncCustodyBranchVisibility()}
function filteredCustodies(){const q=String($('#custodySearch')?.value||'').trim().toLowerCase(),type=$('#custodyTypeFilter')?.value||'',branch=$('#custodyBranchFilter')?.value||'',status=$('#custodyStatusFilter')?.value||'';const ids=visibleEmployees().map(e=>e.id);return state.custodies.filter(x=>ids.includes(x.employeeId)).filter(x=>{const search=[x.item,x.serial,emp(x.employeeId)?.name,emp(x.employeeId)?.department,custodyBranch(x)].join(' ').toLowerCase();return(!q||search.includes(q))&&(!type||x.custodyType===type)&&(!branch||custodyBranch(x)===branch)&&(!status||x.status===status)})}
function exportCustodiesCSV(){const list=filteredCustodies();downloadCSV(`orbit-custodies-${todayISO()}.csv`,['النوع','الفرع المستلم','الموظف المسؤول','العهدة','السيريال','القيمة الأصلية','مصروف معتمد','معلق','الرصيد أو القيمة الحالية','تاريخ التسليم','تاريخ التسوية','الحالة'],list.map(x=>{const isFin=x.custodyType==='financial';return [custodyTypeLabel(x),custodyBranch(x),emp(x.employeeId)?.name||'',x.item,x.serial||'',custodyTotalValue(x),isFin?custodyApprovedSpent(x):'',isFin?custodyPendingSpent(x):'',isFin?custodyRemaining(x):custodyTotalValue(x),x.assignedDate,x.returnDate||'',custodyStatusLabel(x.status,x)]}))}
function custodyModal(id=''){
  const firstEmployee=visibleEmployees()[0],x=id?state.custodies.find(x=>x.id===id):{custodyType:'financial',employeeId:firstEmployee?.id||'',branch:firstEmployee?.branch||getBranches()[0]||'',item:'',serial:'',quantity:1,value:0,assignedDate:todayISO(),returnDate:'',returnedCash:0,status:'assigned',notes:''};
  const selectedBranch=custodyBranch(x)||getBranches()[0]||'';
  openModal(id?'تعديل العهدة':'إضافة عهدة جديدة',`<form id="custodyForm" class="form-grid"><div class="field"><label>نوع العهدة</label><select class="select" name="custodyType" onchange="toggleCustodyTypeFields(this.value)"><option value="financial" ${x.custodyType==='financial'?'selected':''}>عهدة مالية مرتبطة بالمصروفات</option><option value="asset" ${x.custodyType!=='financial'?'selected':''}>عهدة عينية (جهاز / أداة)</option></select></div><div class="field"><label>الفرع المستلم للعهدة</label><select class="select" name="branch" required onchange="updateCustodyBranchHint(this.value)">${getBranches().map(b=>`<option value="${escapeHTML(b)}" ${b===selectedBranch?'selected':''}>${escapeHTML(b)} — ${escapeHTML(branchCurrencyLabel(b))}</option>`).join('')}</select><div class="help" id="custodyBranchHint">العملة المستخدمة: ${escapeHTML(branchCurrencyLabel(selectedBranch))}</div></div><div class="field"><label>الموظف المسؤول</label><select class="select" name="employeeId" required>${visibleEmployees().map(e=>`<option value="${e.id}" ${e.id===x.employeeId?'selected':''}>${escapeHTML(e.name)} — فرعه الوظيفي: ${escapeHTML(e.branch)}</option>`).join('')}</select><div class="help">يمكن أن يكون الفرع المستلم مختلفًا عن الفرع الوظيفي للموظف المسؤول.</div></div>${field('اسم / بيان العهدة','item',x.item,'text',true)}${field('رقم العهدة أو السيريال','serial',x.serial||'','text')}<div class="field custody-asset-field"><label>الكمية</label><input class="input" name="quantity" type="number" min="1" step="1" value="${x.quantity||1}"></div><div class="field"><label id="custodyValueLabel">${x.custodyType==='financial'?'مبلغ العهدة':'قيمة الوحدة'}</label><input class="input" name="value" type="number" min="0" step="0.01" value="${x.value||0}" required><div class="help" id="custodyValueHelp">${x.custodyType==='financial'?'يظهر الرصيد بعد خصم المصروفات المعتمدة والمعلقة.':'إجمالي القيمة = الكمية × قيمة الوحدة.'}</div></div>${field('تاريخ التسليم / الصرف','assignedDate',x.assignedDate,'date',true)}${field('تاريخ الرد / التسوية','returnDate',x.returnDate||'','date')}<div class="field"><label>الحالة</label><select class="select" name="status" id="custodyStatusSelect"><option value="assigned" ${x.status==='assigned'?'selected':''}>مفتوحة / بعهدة الموظف</option><option value="returned" ${x.status==='returned'?'selected':''}>تمت التسوية / الرد</option>${x.custodyType!=='financial'?`<option value="damaged" ${x.status==='damaged'?'selected':''}>تالف</option><option value="lost" ${x.status==='lost'?'selected':''}>مفقود</option>`:''}</select></div><div class="field full"><label>ملاحظات</label><textarea class="textarea" name="notes" rows="3">${escapeHTML(x.notes||'')}</textarea></div><div class="field full"><div class="notice">العهدة المالية ترتبط بمصروفات نفس الفرع المستلم فقط. مبلغ العهدة نفسه لا يُسجل كمصروف؛ الذي يظهر في إجمالي مصروفات الشركة هو حركات المصروف المعتمدة المرتبطة بها.</div></div></form>`,()=>saveCustody(id));setTimeout(()=>toggleCustodyTypeFields(x.custodyType),0)
}
function updateCustodyBranchHint(branch){const el=$('#custodyBranchHint');if(el)el.textContent=`العملة المستخدمة: ${branchCurrencyLabel(branch)}`}
function toggleCustodyTypeFields(type){$$('.custody-asset-field').forEach(el=>el.classList.toggle('hidden',type==='financial'));const label=$('#custodyValueLabel'),help=$('#custodyValueHelp'),status=$('#custodyStatusSelect');if(label)label.textContent=type==='financial'?'مبلغ العهدة':'قيمة الوحدة';if(help)help.textContent=type==='financial'?'يظهر الرصيد بعد خصم المصروفات المعتمدة والمعلقة.':'إجمالي القيمة = الكمية × قيمة الوحدة.';if(status){const current=status.value;status.innerHTML=`<option value="assigned">${type==='financial'?'مفتوحة':'بعهدة الموظف'}</option><option value="returned">${type==='financial'?'تمت التسوية':'تم الرد'}</option>${type==='financial'?'':'<option value="damaged">تالف</option><option value="lost">مفقود</option>'}`;status.value=[...status.options].some(o=>o.value===current)?current:'assigned'}}
function saveCustody(id){const form=$('#custodyForm');if(!form?.reportValidity())return;const o=Object.fromEntries(new FormData(form).entries());o.custodyType=o.custodyType==='financial'?'financial':'asset';o.branch=String(o.branch||'').trim();o.quantity=o.custodyType==='financial'?1:Number(o.quantity||1);o.value=Number(o.value||0);o.returnedCash=Number(id?custodyById(id)?.returnedCash||0:0);if(!o.branch||!getBranches().includes(o.branch))return toast('اختر الفرع المستلم للعهدة','error');if(!o.item.trim())return toast('اكتب اسم العهدة','error');if(o.value<=0)return toast('أدخل قيمة أو مبلغًا أكبر من صفر','error');const old=id?custodyById(id):null,linked=id?linkedCustodyExpenses(id,['approved','pending','rejected']):[];if(old?.custodyType==='financial'&&o.custodyType!=='financial'&&linked.length)return toast('لا يمكن تحويل عهدة مالية مرتبطة بمصروفات إلى عهدة عينية','error');if(old?.custodyType==='financial'&&linked.length&&custodyBranch(old)!==o.branch)return toast('لا يمكن تغيير الفرع المستلم بعد ربط العهدة بمصروفات','error');if(o.custodyType==='financial'){const committed=id?custodyCommitted(old):0;if(committed+o.returnedCash>o.value+.001)return toast('المبلغ الجديد أقل من المصروفات والرصيد المرتجع المرتبطين بالعهدة','error');if(o.status==='returned'&&old?.status!=='returned'){const pending=id?custodyPendingSpent(old):0;if(pending>0)return toast('لا يمكن إغلاق العهدة لوجود مصروفات معلقة','error');o.returnedCash=Math.max(0,o.value-(id?custodyApprovedSpent(old):0));o.returnDate=o.returnDate||todayISO()}}if(id)Object.assign(old,o,{updatedAt:new Date().toISOString()});else state.custodies.push({id:uid('c'),...o,createdAt:new Date().toISOString()});if(o.status!=='assigned'&&!o.returnDate)o.returnDate=todayISO();logAudit(id?'تعديل عهدة':'إضافة عهدة','العُهد',`${custodyTypeLabel(o)} — ${o.item} — الفرع ${o.branch} — ${emp(o.employeeId)?.name||''}`);saveState();closeModal();render();toast('تم حفظ العهدة')}
function showCustodyExpenses(id){const c=custodyById(id);if(!c)return;const list=linkedCustodyExpenses(id,['approved','pending','rejected']);openModal(`مصروفات العهدة: ${c.item}`,`<div class="custody-financial-note custody-expense-summary" style="margin-bottom:14px"><div><strong>الفرع المستلم:</strong> ${escapeHTML(custodyBranch(c)||'-')} · <strong>الموظف المسؤول:</strong> ${escapeHTML(emp(c.employeeId)?.name||'-')}</div><button class="btn btn-secondary btn-sm" type="button" onclick="closeModal();go('expenses')">فتح صفحة مصروفات الشركة</button></div><div class="grid grid-3">${metric('💵',money(c.value,custodyCurrency(c)),'مبلغ العهدة','الأصل')}${metric('▣',money(custodyApprovedSpent(c),custodyCurrency(c)),'مصروف معتمد','يظهر في المصروفات')}${metric('◈',money(custodyRemaining(c),custodyCurrency(c)),'الرصيد المتاح','بعد المعلق والمعتمد')}</div><div class="card" style="margin-top:16px;padding:0;box-shadow:none">${list.length?`<div class="table-wrap"><table class="table"><thead><tr><th>التاريخ</th><th>اسم المصروف</th><th>المبلغ</th><th>الحالة</th><th>إجراء</th></tr></thead><tbody>${list.map(x=>`<tr><td>${fmtDate(x.date)}</td><td>${escapeHTML(x.title)}</td><td>${moneyForExpense(x)}</td><td>${statusBadge(x.status)}</td><td><button class="btn btn-secondary btn-sm" onclick="closeModal();go('expenses');setTimeout(()=>viewExpense('${x.id}'),50)">عرض</button></td></tr>`).join('')}</tbody></table></div>`:noReportData('لا توجد مصروفات مرتبطة بهذه العهدة')}</div>`) }
function settleFinancialCustody(id){const c=custodyById(id);if(!c||c.custodyType!=='financial')return;const pending=custodyPendingSpent(c);if(pending>0)return toast(`لا يمكن التسوية لوجود مصروفات معلقة بقيمة ${money(pending,custodyCurrency(c))}`,'error');const remaining=custodyRemaining(c);if(!confirm(remaining>0?`الرصيد المتبقي ${money(remaining,custodyCurrency(c))}. هل تم رده للخزينة وإغلاق العهدة؟`:'إغلاق العهدة بعد اكتمال صرف رصيدها؟'))return;c.returnedCash=Number(c.returnedCash||0)+remaining;c.status='returned';c.returnDate=todayISO();c.updatedAt=new Date().toISOString();logAudit('تسوية عهدة مالية','العُهد',`${c.item} — مرتجع ${money(remaining,custodyCurrency(c))}`);saveState();render();toast('تمت تسوية العهدة المالية')}
function closeCustody(id,status){const x=state.custodies.find(x=>x.id===id);if(!x)return;if(x.custodyType==='financial')return settleFinancialCustody(id);x.status=status;x.returnDate=todayISO();logAudit('تحديث عهدة عينية','العُهد',`${x.item} — ${custodyStatusLabel(status,x)}`);saveState();render();toast(status==='returned'?'تم تسجيل رد العهدة':'تم تحديث حالة العهدة')}
function deleteCustody(id){const c=custodyById(id);if(!c)return;if(linkedCustodyExpenses(id,['approved','pending','rejected']).length)return toast('لا يمكن حذف عهدة مرتبطة بمصروفات. افصل المصروفات عنها أولًا.','error');if(!confirm('حذف العهدة؟'))return;state.custodies=state.custodies.filter(x=>x.id!==id);logAudit('حذف عهدة','العُهد',c.item);saveState();render();toast('تم الحذف')}
function goToCustody(id){go('custody');setTimeout(()=>{const row=document.getElementById(`custody-row-${id}`);if(row){row.scrollIntoView({behavior:'smooth',block:'center'});row.classList.add('row-highlight');setTimeout(()=>row.classList.remove('row-highlight'),2200)}},100)}


function daysOfLeaveInMonth(leave,month){
  const [y,m]=month.split('-').map(Number),start=new Date(y,m-1,1),end=new Date(y,m,0),a=new Date(leave.from+'T12:00:00'),b=new Date(leave.to+'T12:00:00');
  const from=a>start?a:start,to=b<end?b:end;return to<from?0:Math.floor((to-from)/86400000)+1;
}
function approvedAdjustments(employeeId,month,kind,endDate=''){return state.adjustments.filter(x=>x.employeeId===employeeId&&x.status==='approved'&&x.kind===kind&&x.date.startsWith(month)&&(!endDate||x.date<=endDate)).reduce((sum,x)=>sum+Number(x.amount||0),0)}
function payrollMonthLastDate(month){const [y,m]=month.split('-').map(Number);return `${month}-${String(new Date(y,m,0).getDate()).padStart(2,'0')}`}
function payrollDateRange(month){const last=payrollMonthLastDate(month),dates=[];for(let d=1;d<=Number(last.slice(-2));d++)dates.push(`${month}-${String(d).padStart(2,'0')}`);return dates}
function shiftMinutesForDate(shiftId,date){const plan=shiftDaySchedule(shift(shiftId),date);if(!plan)return 0;const toMin=v=>{const [h,m]=String(v||'00:00').split(':').map(Number);return h*60+m};let start=toMin(plan.start),end=toMin(plan.end);if(end<=start)end+=1440;return Math.max(0,end-start)}
function payrollPeriodEnd(month,mode='auto'){const last=payrollMonthLastDate(month),today=todayISO(),resolved=mode==='auto'?(month===monthISO()?state.settings.currentMonthPayrollMode:'full'):mode;if(resolved==='full'||month<monthISO())return {mode:'full',end:last};if(month>monthISO())return {mode:'to_date',end:`${month}-00`};return {mode:'to_date',end:today<last?today:last}}
function dateSetFromRanges(list,dates,predicate=()=>true){const out=new Set;for(const item of list){if(!predicate(item))continue;for(const date of dates)if(date>=item.from&&date<=item.to)out.add(date)}return out}
function payrollAttendanceSummary(employeeId,month,endDate){
  const byDate={};state.attendance.filter(a=>a.employeeId===employeeId&&a.date.startsWith(month)&&a.date<=endDate).forEach(a=>{
    const row=byDate[a.date]||(byDate[a.date]={present:false,lateMinutes:0,overtimeMinutes:0,earlyLeaveMinutes:0});
    if(['present','late'].includes(a.status))row.present=true;
    row.lateMinutes=Math.max(row.lateMinutes,Number(a.lateMinutes||0));row.overtimeMinutes=Math.max(row.overtimeMinutes,Number(a.overtimeMinutes||0));row.earlyLeaveMinutes=Math.max(row.earlyLeaveMinutes,Number(a.earlyLeaveMinutes||0));
  });return byDate
}
function payrollBreakdown(e,month,mode='auto'){
  const period=payrollPeriodEnd(month,mode),allMonthDates=payrollDateRange(month),fullScheduledDates=allMonthDates.filter(d=>shiftMinutesForDate(e.shiftId,d)>0);
  const hire=e.hireDate||`${month}-01`,eligibleFull=fullScheduledDates.filter(d=>d>=hire),periodDates=eligibleFull.filter(d=>d<=period.end);
  const fullMinutes=fullScheduledDates.reduce((n,d)=>n+shiftMinutesForDate(e.shiftId,d),0)||Math.max(1,Number(state.settings.workDays||26))*480;
  const periodMinutes=periodDates.reduce((n,d)=>n+shiftMinutesForDate(e.shiftId,d),0);
  const attendance=payrollAttendanceSummary(e.id,month,period.end),present=new Set(Object.entries(attendance).filter(([,r])=>r.present).map(([d])=>d));
  const leaves=state.leaves.filter(l=>l.employeeId===e.id&&l.status==='approved');
  const paidLeave=dateSetFromRanges(leaves,periodDates,l=>(typeof l.paid==='boolean'?l.paid:leaveTypeInfo(l.leaveTypeId||l.type).paid)===true);
  const unpaidLeave=dateSetFromRanges(leaves,periodDates,l=>(typeof l.paid==='boolean'?l.paid:leaveTypeInfo(l.leaveTypeId||l.type).paid)===false);
  const missions=new Set(state.missions.filter(m=>m.employeeId===e.id&&m.status==='approved'&&m.date.startsWith(month)&&m.date<=period.end).map(m=>m.date));
  const holidays=state.holidays.filter(h=>h.status==='active'&&(!h.branch||h.branch===e.branch));
  const paidHolidays=dateSetFromRanges(holidays,periodDates,h=>String(h.paid)!=='false'),unpaidHolidays=dateSetFromRanges(holidays,periodDates,h=>String(h.paid)==='false');
  const buckets={worked:[],mission:[],paidLeave:[],paidHoliday:[],unpaid:[],absent:[]};
  for(const d of periodDates){
    if(present.has(d))buckets.worked.push(d);
    else if(missions.has(d))buckets.mission.push(d);
    else if(paidLeave.has(d))buckets.paidLeave.push(d);
    else if(paidHolidays.has(d))buckets.paidHoliday.push(d);
    else if(unpaidLeave.has(d)||unpaidHolidays.has(d))buckets.unpaid.push(d);
    else buckets.absent.push(d);
  }
  const minuteRate=Number(e.salary||0)/fullMinutes,dayRate=Number(e.salary||0)/Math.max(1,fullScheduledDates.length||Number(state.settings.workDays||26));
  const lateMinutes=Object.values(attendance).reduce((n,r)=>n+r.lateMinutes,0),earlyLeaveMinutes=Object.values(attendance).reduce((n,r)=>n+Number(r.earlyLeaveMinutes||0),0),overtimeMinutes=Object.values(attendance).reduce((n,r)=>n+r.overtimeMinutes,0);
  const overtime=state.settings.overtimeCalculationMethod==='fixed'?(overtimeMinutes/60)*Number(state.settings.overtimeRatePerHour||0):overtimeMinutes*minuteRate*Number(state.settings.overtimeMultiplier||1.5);
  const lateDed=state.settings.lateDeductionMethod==='fixed'?lateMinutes*Number(state.settings.lateDeductionPerMinute||0):lateMinutes*minuteRate;
  const earlyLeaveDed=state.settings.lateDeductionMethod==='fixed'?earlyLeaveMinutes*Number(state.settings.lateDeductionPerMinute||0):earlyLeaveMinutes*minuteRate;
  const minutesOf=arr=>arr.reduce((n,d)=>n+shiftMinutesForDate(e.shiftId,d),0);
  const absenceDed=minutesOf(buckets.absent)*minuteRate,unpaidLeaveDed=minutesOf(buckets.unpaid)*minuteRate;
  const base=Number(e.salary||0)*(periodMinutes/fullMinutes),factor=Number(e.salary||0)>0?Math.min(1,base/Number(e.salary||0)):0;
  const manualDeductions=approvedAdjustments(e.id,month,'deduction',period.end),rewards=approvedAdjustments(e.id,month,'reward',period.end);
  const insuranceDeduction=Number(e.insuranceDeduction||0)*factor,taxDeduction=Number(e.taxDeduction||0)*factor,statutoryDeductions=insuranceDeduction+taxDeduction;
  const otherDeductions=lateDed+earlyLeaveDed+absenceDed+unpaidLeaveDed+manualDeductions,deductions=otherDeductions+statutoryDeductions,gross=base+overtime+rewards,net=gross-deductions;
  return {currency:getBranchCurrency(e.branch),contractBase:Number(e.salary||0),base,overtime,rewards,gross,manualDeductions,insuranceDeduction,taxDeduction,statutoryDeductions,otherDeductions,lateDed,earlyLeaveDed,absenceDed,unpaidLeaveDed,deductions,net,lateMinutes,earlyLeaveMinutes,overtimeMinutes,absenceDays:buckets.absent.length,paidLeaveDays:buckets.paidLeave.length,unpaidLeaveDays:buckets.unpaid.length,missionDays:buckets.mission.length,paidHolidayDays:buckets.paidHoliday.length,workedDays:buckets.worked.length,scheduledDays:fullScheduledDates.length,eligibleDays:periodDates.length,scheduledMinutes:fullMinutes,eligibleMinutes:periodMinutes,minuteRate,dayRate,calculationMode:period.mode,periodEnd:period.end};
}
function payrollActionButtons(p){
  let b=`<button class="btn btn-secondary btn-sm" onclick="showPayslip('${p.id}')">تفاصيل / قسيمة</button>`;
  if(currentUser.role==='manager'&&p.status==='draft')b+=` <button class="btn btn-success btn-sm" onclick="setPayrollStatus('${p.id}','reviewed')">تمت المراجعة</button>`;
  if(canOperatePayroll()){if(p.status==='draft')b+=` <button class="btn btn-secondary btn-sm" onclick="setPayrollStatus('${p.id}','reviewed')">مراجعة</button>`;if(p.status==='reviewed')b+=` <button class="btn btn-success btn-sm" onclick="setPayrollStatus('${p.id}','approved')">اعتماد</button>`;if(p.status==='approved')b+=` <button class="btn btn-success btn-sm" onclick="setPayrollStatus('${p.id}','paid')">تم الصرف</button>`;if(p.status==='paid')b+=` <button class="btn btn-secondary btn-sm" onclick="setPayrollStatus('${p.id}','locked')">إغلاق الشهر</button>`}
  return b
}
function payrollModeLabel(p){return p.calculationMode==='to_date'?`حتى ${fmtDate(p.periodEnd)}`:'شهر كامل'}
function payrollRowsTable(rows){const ordered=[...rows].sort((a,b)=>{const ma=String(a.month||''),mb=String(b.month||'');if(ma!==mb)return mb.localeCompare(ma);const ea=emp(a.employeeId)?.name||'',eb=emp(b.employeeId)?.name||'';return ea.localeCompare(eb,'ar')||String(a.employeeId).localeCompare(String(b.employeeId))});return `<div class="table-wrap"><table class="table payroll-table"><thead><tr><th>الموظف</th><th>الفترة</th><th>الراتب الشهري</th><th>الأساسي المستحق</th><th>إجمالي الاستحقاقات</th><th>إجمالي الخصومات</th><th>الصافي</th><th>الحالة</th><th>إجراءات</th></tr></thead><tbody>${ordered.map(p=>{const e=emp(p.employeeId),c=p.currency||getBranchCurrency(e?.branch),grossValue=p.gross||Number(p.base||0)+Number(p.overtime||0)+Number(p.rewards||0),employeeMeta=[e?.department,e?.branch].filter(Boolean).join(' · ');return `<tr data-record-id="${p.id}" data-payroll data-date="${p.month}-01" data-month="${p.month}" data-branch="${escapeHTML(e?.branch||'')}" data-employee="${escapeHTML(p.employeeId)}" data-status="${p.status}"><td><strong>${escapeHTML(e?.name||'-')}</strong><div class="small muted">${escapeHTML(employeeMeta||'-')}</div></td><td><strong>${p.month}</strong><div class="small muted">${payrollModeLabel(p)}</div></td><td>${money(p.contractBase||p.base,c)}</td><td>${money(p.base,c)}<div class="small muted">${p.eligibleDays||0}/${p.scheduledDays||0} يوم مجدول</div></td><td class="positive-text">${money(grossValue,c)}</td><td class="negative-text">− ${money(p.deductions,c)}</td><td><strong class="payroll-net">${money(p.net,c)}</strong></td><td>${statusBadge(p.status)}</td><td>${payrollActionButtons(p)}</td></tr>`}).join('')}</tbody></table></div>`}
function payrollBranchGroupHTML(branch,rows,index=0){const currency=getBranchCurrency(branch),net=rows.reduce((s,p)=>s+Number(p.net||0),0),gross=rows.reduce((s,p)=>s+Number(p.gross||0),0),deductions=rows.reduce((s,p)=>s+Number(p.deductions||0),0);return `<section class="payroll-branch-group" data-payroll-branch-group data-branch="${escapeHTML(branch)}"><div class="payroll-branch-head"><div><span class="payroll-branch-icon">⌂</span><div><h3>${escapeHTML(branch)}</h3><p>${currencyLabel(currency)} — ${currency}</p></div></div><div class="payroll-branch-stats"><span><small>الموظفون</small><strong>${rows.length}</strong></span><span><small>الاستحقاقات</small><strong>${money(gross,currency)}</strong></span><span><small>الخصومات</small><strong>${money(deductions,currency)}</strong></span><span><small>صافي الفرع</small><strong>${money(net,currency)}</strong></span></div></div>${payrollRowsTable(rows)}</section>`}
function payrollMonthLabel(month){const [y,m]=String(month||'').split('-');const names=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];const idx=Number(m)-1;return names[idx]?`${names[idx]} ${y}`:month}
function payrollMonthBranchGroupsHTML(rows){
  const branchOrder=getBranches(),groups={};
  rows.forEach(p=>{const e=emp(p.employeeId),branch=e?.branch||p.branch||'بدون فرع';(groups[branch]||(groups[branch]=[])).push(p)});
  const orderedBranches=Object.keys(groups).sort((a,b)=>{const ia=branchOrder.indexOf(a),ib=branchOrder.indexOf(b);if(ia!==-1||ib!==-1)return (ia===-1?9999:ia)-(ib===-1?9999:ib);return a.localeCompare(b,'ar')});
  return orderedBranches.map((branch,i)=>payrollBranchGroupHTML(branch,groups[branch],i)).join('')
}
function payrollMonthGroupHTML(month,rows,branches,index=0){const branchCount=new Set(rows.map(p=>emp(p.employeeId)?.branch||p.branch).filter(Boolean)).size,approved=rows.filter(p=>['approved','paid','locked'].includes(p.status)).length,bodyId=`payroll-month-body-${String(month).replace(/[^0-9A-Za-z_-]/g,'')}`;return `<section class="payroll-month-group" data-payroll-month-group data-month="${escapeHTML(month)}"><div class="payroll-month-head" role="button" tabindex="0" onclick="togglePayrollMonth('${escapeHTML(month)}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();togglePayrollMonth('${escapeHTML(month)}')}" aria-expanded="false" aria-controls="${bodyId}"><div class="payroll-month-title"><span class="payroll-month-icon">📅</span><div><h3>مرتبات شهر ${escapeHTML(payrollMonthLabel(month))}</h3><p>${escapeHTML(month)} · ${rows.length} موظف / سجل راتب · ${branchCount} فرع · اضغط لعرض الفروع والموظفين</p></div></div><div class="payroll-month-stats"><span><small>إجمالي الصافي</small><strong>${sumByCurrency(rows,p=>p.net,p=>p.employeeId)}</strong></span><span><small>الخصومات</small><strong>${sumByCurrency(rows,p=>p.deductions,p=>p.employeeId)}</strong></span><span><small>الفروع</small><strong>${branchCount}</strong></span><span><small>معتمد/مصروف</small><strong>${approved}</strong></span><span class="payroll-month-toggle" aria-hidden="true">⌄</span></div></div><div id="${bodyId}" class="payroll-month-body collapsed">${payrollMonthBranchGroupsHTML(rows)}</div></section>`}
function togglePayrollMonth(month){
  const safeMonth=String(month||''),group=$(`[data-payroll-month-group][data-month="${safeMonth}"]`);if(!group)return;
  const body=group.querySelector('.payroll-month-body'),head=group.querySelector('.payroll-month-head');
  const isOpen=!body?.classList.contains('collapsed');
  body?.classList.toggle('collapsed',isOpen);group.classList.toggle('is-open',!isOpen);head?.setAttribute('aria-expanded',String(!isOpen));
}

function payrollRunBranchEmployees(branch=''){
  return state.employees.filter(e=>e.status==='active'&&e.branch===branch).sort((a,b)=>a.name.localeCompare(b.name,'ar'))
}
function payrollRunEmployeePickerHTML(branch=''){
  if(!branch)return `<div class="payroll-run-employee-empty"><span>👥</span><div><strong>اختر الفرع أولًا</strong><small>سيتم عرض الموظفين النشطين في الفرع لتحديد من تريد احتساب راتبه.</small></div></div>`;
  const employees=payrollRunBranchEmployees(branch);
  if(!employees.length)return `<div class="payroll-run-employee-empty"><span>👥</span><div><strong>لا يوجد موظفون نشطون</strong><small>لا توجد ملفات موظفين نشطة مرتبطة بهذا الفرع.</small></div></div>`;
  return `<div class="payroll-run-employee-head"><div><strong>الموظفون المطلوب احتساب رواتبهم</strong><span id="payrollRunSelectedCount">تم تحديد ${employees.length} من ${employees.length}</span></div><div class="payroll-run-employee-actions"><button type="button" class="btn btn-secondary btn-sm" onclick="setPayrollRunEmployees(true)">تحديد الكل</button><button type="button" class="btn btn-light btn-sm" onclick="setPayrollRunEmployees(false)">مسح التحديد</button></div></div><div class="payroll-run-employee-list">${employees.map(e=>`<label class="payroll-run-employee-item"><input type="checkbox" class="payroll-run-employee-checkbox" value="${escapeHTML(e.id)}" checked onchange="updatePayrollRunEmployeeCount()"><span>${avatarHTML(e,34)}</span><span><strong>${escapeHTML(e.name)}</strong><small>${escapeHTML(e.jobTitle||e.department||'-')}</small></span></label>`).join('')}</div>`;
}
function updatePayrollRunEmployeePicker(branch=''){
  const panel=$('#payrollRunEmployeePanel');if(!panel)return;panel.innerHTML=payrollRunEmployeePickerHTML(branch);applyLanguage(panel);updatePayrollRunEmployeeCount()
}
function updatePayrollRunEmployeeCount(){
  const boxes=$$('.payroll-run-employee-checkbox'),selected=boxes.filter(x=>x.checked).length,counter=$('#payrollRunSelectedCount');if(counter)counter.textContent=`تم تحديد ${selected} من ${boxes.length}`
}
function setPayrollRunEmployees(checked=true){
  $$('.payroll-run-employee-checkbox').forEach(x=>x.checked=checked);updatePayrollRunEmployeeCount()
}
function selectedPayrollRunEmployeeIds(){return $$('.payroll-run-employee-checkbox').filter(x=>x.checked).map(x=>x.value)}
function renderPayroll(){
  const selfOnly=currentUser.role==='employee'&&!userHasCustomPermissions(currentUser),all=selfOnly?state.payroll.filter(p=>p.employeeId===currentUser.employeeId):state.payroll,month=monthISO(),monthRows=all.filter(p=>p.month===month),branches=selfOnly?[ownEmployee()?.branch].filter(Boolean):getBranches();
  const monthGroups=[...new Set(all.map(p=>p.month).filter(Boolean))].sort().reverse().map(m=>({month:m,rows:all.filter(p=>p.month===m)})).filter(g=>g.rows.length);
  return `<div class="page-head"><div><h2>الرواتب مفصولة حسب الشهر</h2><p>كل شهر يظهر كعنوان مستقل، اضغط على مرتبات الشهر لعرض كل الموظفين تحته في جدول واحد.</p></div></div>
  ${canOperatePayroll()?`<div class="payroll-control-card no-print"><div><span class="page-eyebrow">تشغيل مرتبات فرع</span><h3>حدد الفرع والشهر ونطاق الاحتساب والموظفين</h3><p>يمكنك احتساب رواتب كل موظفي الفرع أو اختيار موظفين محددين فقط، دون التأثير على باقي الموظفين.</p></div><div class="payroll-controls"><div class="field"><label>الفرع</label><select class="select" id="payrollRunBranch" required onchange="updatePayrollRunEmployeePicker(this.value)"><option value="">اختر الفرع</option>${getBranches().map(b=>`<option value="${escapeHTML(b)}">${escapeHTML(b)} — ${escapeHTML(branchCurrencyLabel(b))}</option>`).join('')}</select></div><div class="field"><label>الشهر</label><input class="input" type="month" id="payrollMonth" value="${month}"></div><div class="field"><label>نطاق الحساب</label><select class="select" id="payrollMode"><option value="to_date" ${state.settings.currentMonthPayrollMode==='to_date'?'selected':''}>حتى اليوم / استحقاق نسبي</option><option value="full" ${state.settings.currentMonthPayrollMode==='full'?'selected':''}>الشهر كاملًا</option></select></div><button class="btn btn-primary payroll-run-submit" onclick="generatePayrollFromControls()">⚙ احتساب الرواتب المحددة</button><div id="payrollRunEmployeePanel" class="payroll-run-employee-panel">${payrollRunEmployeePickerHTML('')}</div></div></div>`:''}
  <div class="grid grid-4 payroll-metrics">${metric('💳',sumByCurrency(monthRows,p=>p.net,p=>p.employeeId),'صافي الشهر الجاري',`${monthRows.length} موظف`)}${metric('⌂',new Set(monthRows.map(p=>emp(p.employeeId)?.branch).filter(Boolean)).size,'فروع لها مرتبات','كل الفروع مجمعة داخل الشهر')}${metric('−',sumByCurrency(monthRows,p=>p.deductions,p=>p.employeeId),'إجمالي الاستقطاعات','كل الخصومات')}${metric('✓',monthRows.filter(p=>['approved','paid','locked'].includes(p.status)).length,'معتمد أو مصروف','سجلات نهائية')}</div>
  <div class="notice payroll-formula-note"><strong>المعادلة:</strong> الأساسي المستحق + الإضافي + المكافآت − التأخير − الغياب − الإجازات/العطلات غير المدفوعة − الخصومات − التأمينات والضرائب. كل احتساب يُنشأ للفرع المحدد فقط، ثم يظهر داخل مرتبات الشهر المستقل.</div>
  <div class="card payroll-directory"><div class="toolbar payroll-filterbar"><select class="select" id="payrollMonthFilter" onchange="filterPayrollRows()"><option value="">كل الشهور</option>${monthGroups.map(g=>`<option value="${g.month}">${escapeHTML(payrollMonthLabel(g.month))} — ${g.month}</option>`).join('')}</select><select class="select" id="payrollBranchFilter" onchange="filterPayrollRows()"><option value="">كل الفروع</option>${branches.map(b=>`<option value="${escapeHTML(b)}">${escapeHTML(b)}</option>`).join('')}</select><select class="select" id="payrollEmployeeFilter" onchange="filterPayrollRows()"><option value="">كل الموظفين</option>${[...new Set(all.map(p=>p.employeeId))].map(id=>emp(id)).filter(Boolean).sort((a,b)=>a.name.localeCompare(b.name,'ar')).map(e=>`<option value="${escapeHTML(e.id)}">${escapeHTML(e.name)} — ${escapeHTML(e.branch||'-')}</option>`).join('')}</select><select class="select" id="payrollStatusFilter" onchange="filterPayrollRows()"><option value="">كل الحالات</option><option value="draft">مسودة</option><option value="reviewed">تمت المراجعة</option><option value="approved">معتمد</option><option value="paid">تم الصرف</option><option value="locked">مغلق</option></select><span class="result-counter"><b id="payrollVisibleCount">${all.length}</b> سجل</span></div><div class="payroll-month-directory">${monthGroups.length?monthGroups.map((g,i)=>payrollMonthGroupHTML(g.month,g.rows,branches,i)).join(''):`<div class="empty"><span class="emoji">💳</span>لم يتم إنشاء مرتبات بعد</div>`}</div><div id="payrollEmptyFilter" class="empty hidden"><span class="emoji">⌕</span>لا توجد رواتب مطابقة للفلاتر</div></div>`
}
function syncPayrollBranchVisibility(){const visibleRow=(r)=>r.style.display!=='none'&&!r.classList.contains('section-search-hidden');$$('[data-payroll-branch-group]').forEach(group=>{const rows=$$('tr[data-payroll]',group),visible=rows.filter(visibleRow).length;group.classList.toggle('filter-hidden',visible===0)});$$('[data-payroll-month-group]').forEach(group=>{const visible=$$('tr[data-payroll]',group).filter(visibleRow).length;group.classList.toggle('filter-hidden',visible===0)});const total=$$('tr[data-payroll]').filter(visibleRow).length;if($('#payrollVisibleCount'))$('#payrollVisibleCount').textContent=total;$('#payrollEmptyFilter')?.classList.toggle('hidden',total!==0)}
function filterPayrollRows(){const m=$('#payrollMonthFilter')?.value||'',b=$('#payrollBranchFilter')?.value||'',employeeId=$('#payrollEmployeeFilter')?.value||'',st=$('#payrollStatusFilter')?.value||'';$$('tr[data-payroll]').forEach(r=>{const show=(!m||r.dataset.month===m)&&(!b||r.dataset.branch===b)&&(!employeeId||r.dataset.employee===employeeId)&&(!st||r.dataset.status===st);r.style.display=show?'':'none'});syncPayrollBranchVisibility();updateBulkSelection()}
function generatePayrollFromControls(){
  const month=$('#payrollMonth')?.value||monthISO(),mode=$('#payrollMode')?.value||'to_date',branch=$('#payrollRunBranch')?.value||'';
  if(!branch)return toast('اختر الفرع الذي تريد احتساب رواتبه','error');
  const employeeIds=selectedPayrollRunEmployeeIds();if(!employeeIds.length)return toast('حدد موظفًا واحدًا على الأقل لاحتساب راتبه','error');
  state.settings.currentMonthPayrollMode=mode;generatePayroll(month,mode,branch,employeeIds)
}
function generatePayroll(month,mode='auto',branch='',employeeIds=null){
  let skipped=0,created=0,updated=0;if(!/^\d{4}-\d{2}$/.test(month))return toast('اختر شهرًا صحيحًا','error');if(!branch||!getBranches().includes(branch))return toast('اختر فرعًا صحيحًا','error');
  const branchEmployees=payrollRunBranchEmployees(branch),selectedIds=Array.isArray(employeeIds)?new Set(employeeIds):null,employees=selectedIds?branchEmployees.filter(e=>selectedIds.has(e.id)):branchEmployees;
  if(!branchEmployees.length)return toast('لا يوجد موظفون نشطون في هذا الفرع','error');if(!employees.length)return toast('حدد موظفًا واحدًا على الأقل من موظفي الفرع','error');
  employees.forEach(e=>{const old=state.payroll.find(p=>p.employeeId===e.id&&p.month===month);if(old&&['approved','paid','locked'].includes(old.status)){skipped++;return}const calc=payrollBreakdown(e,month,mode),data=Object.fromEntries(Object.entries(calc).map(([k,v])=>[k,typeof v==='number'?+v.toFixed(2):v]));data.status=old?.status==='reviewed'?'reviewed':'draft';data.branch=branch;if(old){Object.assign(old,data);updated++}else{state.payroll.push({id:uid('p'),employeeId:e.id,month,...data});created++}});
  logAudit('احتساب رواتب موظفين','الرواتب',`${branch} — ${month} — ${mode==='to_date'?'حتى اليوم':'شهر كامل'} — المحددون ${employees.length} — جديد ${created} — محدث ${updated} — تم تخطي ${skipped} سجل نهائي`);saveState();render();toast(`تم احتساب رواتب ${created+updated} موظف من فرع ${branch}${skipped?` مع تخطي ${skipped} سجل نهائي`:''}`)
}
function setPayrollStatus(id,status){const p=state.payroll.find(x=>x.id===id);if(!p)return;const allowed={draft:['reviewed'],reviewed:['approved'],approved:['paid'],paid:['locked']}[p.status]||[];if(!allowed.includes(status))return toast('انتقال حالة غير مسموح من الزر السريع. استخدم «تعديل حالة» للانتقال المرن.','error');if(['approved','paid','locked'].includes(status)&&!canOperatePayroll())return toast('الإجراء غير متاح حسب صلاحيات الحساب','error');p.status=status;p.statusUpdatedAt=new Date().toISOString();p.statusUpdatedBy=currentUser.id;logAudit('تحديث حالة راتب','الرواتب',`${emp(p.employeeId)?.name||''} — ${p.month} — ${statusText(status)}`);saveState();render();toast(`تم تحديث الحالة إلى ${statusText(status)}`)}
function showPayslip(id){const p=state.payroll.find(p=>p.id===id),e=emp(p.employeeId),c=p.currency||getBranchCurrency(e?.branch),gross=p.gross||Number(p.base||0)+Number(p.overtime||0)+Number(p.rewards||0);openModal('تفاصيل وقسيمة الراتب',`<div class="payslip"><div class="payslip-head"><div><h2 style="margin:0">${escapeHTML(state.settings.company)}</h2><div class="muted">قسيمة راتب شهر ${p.month} · ${payrollModeLabel(p)}</div></div><div class="payslip-logo-frame"><img class="payslip-company-logo" src="orbit-logo-ui.png" alt="شعار أوربت"></div></div><div class="payslip-grid"><div>${infoCard('الموظف',e.name)}</div><div>${infoCard('الوظيفة',e.jobTitle)}</div><div>${infoCard('الكود',e.code)}</div><div>${infoCard('القسم',e.department)}</div><div>${infoCard('الفرع',e.branch)}</div><div>${infoCard('العملة',`${currencyLabel(c)} — ${c}`)}</div><div>${infoCard('الفترة المحتسبة',payrollModeLabel(p))}</div><div>${infoCard('أيام الاستحقاق',`${p.eligibleDays||0} من ${p.scheduledDays||0}`)}</div></div><div class="payroll-breakdown"><section><h3>الاستحقاقات</h3><div class="payslip-row"><span>الراتب الشهري التعاقدي</span><strong>${money(p.contractBase||p.base,c)}</strong></div><div class="payslip-row"><span>الأساسي المستحق للفترة</span><strong>${money(p.base,c)}</strong></div><div class="payslip-row"><span>العمل الإضافي (${minutesToHM(p.overtimeMinutes)})</span><strong class="positive-text">+ ${money(p.overtime,c)}</strong></div><div class="payslip-row"><span>المكافآت المعتمدة</span><strong class="positive-text">+ ${money(p.rewards||0,c)}</strong></div><div class="payslip-subtotal"><span>إجمالي الاستحقاقات</span><strong>${money(gross,c)}</strong></div></section><section><h3>الخصومات</h3><div class="payslip-row"><span>التأخير (${p.lateMinutes||0} دقيقة)</span><strong class="negative-text">− ${money(p.lateDed||0,c)}</strong></div><div class="payslip-row"><span>الغياب (${p.absenceDays||0} يوم)</span><strong class="negative-text">− ${money(p.absenceDed||0,c)}</strong></div><div class="payslip-row"><span>بدون راتب (${p.unpaidLeaveDays||0} يوم)</span><strong class="negative-text">− ${money(p.unpaidLeaveDed||0,c)}</strong></div><div class="payslip-row"><span>خصومات إدارية معتمدة</span><strong class="negative-text">− ${money(p.manualDeductions||0,c)}</strong></div><div class="payslip-row"><span>قسط السلفة</span><strong class="negative-text">− ${money(p.advanceDeduction||0,c)}</strong></div><div class="payslip-row"><span>التأمينات</span><strong class="negative-text">− ${money(p.insuranceDeduction||0,c)}</strong></div><div class="payslip-row"><span>الضرائب</span><strong class="negative-text">− ${money(p.taxDeduction||0,c)}</strong></div><div class="payslip-subtotal"><span>إجمالي الخصومات</span><strong>${money(p.deductions,c)}</strong></div></section></div><div class="payroll-attendance-strip"><span>حضور: <b>${p.workedDays||0}</b></span><span>مأموريات: <b>${p.missionDays||0}</b></span><span>إجازات مدفوعة: <b>${p.paidLeaveDays||0}</b></span><span>عطلات مدفوعة: <b>${p.paidHolidayDays||0}</b></span><span>غياب: <b>${p.absenceDays||0}</b></span></div><div class="payslip-total"><span>صافي المستحق</span><span>${money(p.net,c)}</span></div></div>`,()=>window.print(),'طباعة')}
function payrollReportTable(list,compact=false){return `<div class="table-wrap"><table class="table ${compact?'compact-table':'report-detail-table'}"><thead><tr><th>الموظف</th><th>الفترة</th><th>الراتب الشهري</th><th>الأساسي المستحق</th><th>الإضافي</th><th>المكافآت</th><th>إجمالي الاستحقاقات</th><th>إجمالي الخصومات</th><th>الصافي</th><th>الحالة</th></tr></thead><tbody>${list.map(p=>{const e=emp(p.employeeId),c=p.currency||employeeCurrency(p.employeeId),gross=p.gross||Number(p.base||0)+Number(p.overtime||0)+Number(p.rewards||0);return `<tr><td>${escapeHTML(e?.name||'-')}<div class="small muted">${escapeHTML(e?.branch||'-')}</div></td><td>${p.month}<div class="small muted">${payrollModeLabel(p)}</div></td><td>${money(p.contractBase||p.base,c)}</td><td>${money(p.base,c)}</td><td>${money(p.overtime,c)}</td><td>${money(p.rewards||0,c)}</td><td>${money(gross,c)}</td><td>${money(p.deductions,c)}</td><td><strong>${money(p.net,c)}</strong></td><td>${statusBadge(p.status)}</td></tr>`}).join('')}</tbody></table></div>`}


const REPORT_TYPES={
  comprehensive:{label:'التقرير الشامل',icon:'▥',desc:'ملخص موحد لكل بيانات الموارد البشرية'},
  employees:{label:'الموظفون',icon:'👥',desc:'بيانات الموظفين والرواتب الأساسية والحسابات'},
  documents:{label:'العقود والمستندات',icon:'📁',desc:'العقود والهويات والمؤهلات وتواريخ الانتهاء'},
  attendance:{label:'الحضور والانصراف',icon:'◷',desc:'الدخول والخروج والتأخير والعمل الإضافي'},
  leaves:{label:'الإجازات',icon:'☂',desc:'أنواع الإجازات والأيام والحالات'},
  missions:{label:'المأموريات',icon:'⌖',desc:'الزيارات الخارجية والمواقع والمواعيد'},
  expenses:{label:'مصروفات الشركة',icon:'▣',desc:'المصروفات التشغيلية حسب الفرع والعملة والمرفقات'},
  adjustments:{label:'الخصومات والمكافآت',icon:'±',desc:'كل الحركات المالية الإضافية'},
  custody:{label:'العُهد',icon:'▦',desc:'الأجهزة والمعدات وحالات التسليم والرد'},
  payroll:{label:'الرواتب',icon:'💳',desc:'الأساسي والإضافي والخصومات وصافي المستحق'},
  branches:{label:'الفروع والعملات',icon:'⌂',desc:'ملخص مستقل لكل فرع وعملته'}
};
let currentReportType='comprehensive';

function reportEmployeeIds(branch='',department='',employeeId=''){
  return visibleEmployees().filter(e=>(!branch||e.branch===branch)&&(!department||e.department===department)&&(!employeeId||e.id===employeeId)).map(e=>e.id);
}
function sumByCurrency(list,amountFn=(x)=>x.amount,employeeIdFn=(x)=>x.employeeId){
  const totals={};
  list.forEach(x=>{const employeeId=employeeIdFn(x),c=x.currency||employeeCurrency(employeeId);totals[c]=(totals[c]||0)+Number(amountFn(x)||0)});
  const entries=Object.entries(totals);
  return entries.length?entries.map(([c,v])=>money(v,c)).join('<br>'):money(0,state.settings.currency);
}
function sumExpensesByCurrency(list){const totals={};list.forEach(x=>{const c=expenseCurrency(x);totals[c]=(totals[c]||0)+Number(x.amount||0)});const entries=Object.entries(totals);return entries.length?entries.map(([c,v])=>money(v,c)).join('<br>'):money(0,state.settings.currency)}

function statusText(status){return {active:'نشط',inactive:'غير نشط',present:'حاضر',late:'متأخر',absent:'غائب',pending:'قيد المراجعة',approved:'معتمد',rejected:'مرفوض',paid:'تم الصرف',locked:'مغلق',reviewed:'تمت المراجعة',draft:'مسودة',assigned:'بعهدة الموظف',returned:'تم الرد',damaged:'تالف',lost:'مفقود',scheduled:'مجدول',completed:'مكتمل',cancelled:'ملغى',connected:'متصل',disconnected:'غير متصل',maintenance:'صيانة',in_progress:'قيد التنفيذ',issued:'صادر',sent:'تم الإرسال',closed:'مغلق',interview:'مقابلة',offered:'عرض وظيفي',hired:'تم التعيين',suspended:'موقوف',settled:'تمت التسوية',open:'مفتوح',resolved:'تم الحل',published:'منشور',expired:'منتهي',archived:'مؤرشف',high:'عالية',medium:'متوسطة',low:'منخفضة'}[status]||status||'-'}
function monthDateRange(month){const [y,m]=month.split('-').map(Number),last=String(new Date(y,m,0).getDate()).padStart(2,'0');return {start:`${month}-01`,end:`${month}-${last}`}}
function overlapsMonth(from,to,month){const r=monthDateRange(month);return String(from||'')<=r.end&&String(to||from||'')>=r.start}
function reportContext(month,branch='',department='',employeeId=''){
  const ids=reportEmployeeIds(branch,department,employeeId),employees=visibleEmployees().filter(e=>ids.includes(e.id)),range=monthDateRange(month);
  const documents=state.documents.filter(x=>ids.includes(x.employeeId));
  const attendance=state.attendance.filter(a=>a.date.startsWith(month)&&ids.includes(a.employeeId));
  const leaves=state.leaves.filter(l=>ids.includes(l.employeeId)&&overlapsMonth(l.from,l.to,month));
  const missions=state.missions.filter(m=>ids.includes(m.employeeId)&&m.date.startsWith(month));
  const expenses=state.expenses.filter(x=>x.date.startsWith(month)&&(!branch||expenseBranch(x)===branch));
  const adjustments=state.adjustments.filter(x=>ids.includes(x.employeeId)&&x.date.startsWith(month));
  const payroll=state.payroll.filter(p=>ids.includes(p.employeeId)&&p.month===month);
  const custodies=state.custodies.filter(x=>(!branch||custodyBranch(x)===branch)&&(!department||emp(x.employeeId)?.department===department)&&(!employeeId||x.employeeId===employeeId)&&String(x.assignedDate||'')<=range.end&&(!x.returnDate||String(x.returnDate)>=range.start));
  const extra={};Object.entries(EXTRA_MODULES).forEach(([route,cfg])=>extra[route]=moduleRecordsForReport(cfg,{month,branch,department,employeeId,ids,range}));
  return {month,branch,department,employeeId,ids,employees,documents,attendance,leaves,missions,expenses,adjustments,payroll,custodies,extra,range};
}
function reportFilterSummary(ctx){
  const parts=[`الفترة: ${ctx.month}`];
  if(ctx.branch)parts.push(`الفرع: ${ctx.branch}`);
  if(ctx.department)parts.push(`القسم: ${ctx.department}`);
  if(ctx.employeeId)parts.push(`الموظف: ${emp(ctx.employeeId)?.name||'-'}`);
  return parts.join(' · ');
}
function reportDocument(title,ctx,content,subtitle=''){
  return `<div class="single-report-document"><div class="report-document-head"><div class="report-head-brand"><img src="orbit-mark.png" alt="Orbit"><div><div class="report-company">${escapeHTML(state.settings.company)}</div><h2>${escapeHTML(title)}</h2><p>${escapeHTML(subtitle||REPORT_TYPES[currentReportType]?.desc||'')}</p></div></div><div class="report-period"><strong>${ctx.month}</strong><span>${escapeHTML(reportFilterSummary(ctx))}</span><em>${ctx.employees.length} موظف داخل النطاق</em></div></div>${content}<div class="report-document-foot">تم إنشاء التقرير من نظام أوربت للموارد البشرية · تاريخ الإنشاء: ${fmtDate(todayISO())}</div></div>`;
}
const REPORT_GROUPS=[
  {title:'التقارير الرئيسية',icon:'▥',keys:['comprehensive','employees','documents','branches']},
  {title:'الحضور وشؤون العاملين',icon:'👥',keys:['attendance','leaves','missions','permissions','workInterruptions','terminations','advances','tasks','dues','complaints','letters']},
  {title:'المالية والأصول',icon:'💳',keys:['expenses','adjustments','custody','payroll']},
  {title:'الإدارة والتطوير',icon:'⚙',keys:['holidays','decisions','meetings','shiftRequests','biometricDevices','evaluations','recruitment','notifications','customPages','announcements']}
];
function reportTypeCards(){
  const used=new Set();
  const groups=REPORT_GROUPS.map(group=>{const keys=group.keys.filter(k=>REPORT_TYPES[k]).map(k=>{used.add(k);return k});if(!keys.length)return '';return `<section class="report-directory-group"><div class="report-directory-heading"><span>${group.icon}</span><div><strong>${group.title}</strong><small>${keys.length} تقارير</small></div></div><div class="report-directory-list">${keys.map(key=>reportDirectoryItem(key)).join('')}</div></section>`}).join('');
  const remaining=Object.keys(REPORT_TYPES).filter(k=>!used.has(k));
  return groups+(remaining.length?`<section class="report-directory-group"><div class="report-directory-heading"><span>☷</span><div><strong>تقارير إضافية</strong><small>${remaining.length} تقارير</small></div></div><div class="report-directory-list">${remaining.map(reportDirectoryItem).join('')}</div></section>`:'');
}
function reportDirectoryItem(key){const item=REPORT_TYPES[key];return `<button class="report-type-card ${currentReportType===key?'active':''}" data-report-type="${key}" onclick="selectReportType('${key}')"><span class="report-type-icon">${item.icon}</span><span class="report-type-copy"><strong>${item.label}</strong><small>${item.desc}</small></span><b>←</b></button>`}
function renderReports(){
  const month=monthISO(),item=REPORT_TYPES[currentReportType]||REPORT_TYPES.comprehensive;
  return `<div class="reports-hero no-print"><div><span class="reports-kicker">نظام أوربت للتحليلات والتقارير</span><h2>مركز التقارير</h2><p>كل تقرير مستقل ومنظم، مع فلترة حسب الشهر والفرع والقسم والموظف وتصدير مباشر.</p></div><div class="reports-hero-actions"><button class="btn reports-action-btn" onclick="exportCurrentReport()">▤ تصدير Excel / CSV</button><button class="btn reports-action-btn" onclick="printCurrentReport()">⇩ تصدير PDF</button></div></div>
  <div class="reports-layout no-print"><aside class="report-directory"><div class="report-directory-top"><div><h3>دليل التقارير</h3><p>اختر القسم ثم التقرير المطلوب</p></div><span class="report-count">${Object.keys(REPORT_TYPES).length}</span></div><div class="report-directory-grid">${reportTypeCards()}</div></aside>
  <section class="card report-filter-panel"><div class="report-active-title"><span id="activeReportIcon">${item.icon}</span><div><strong id="activeReportTitle">${item.label}</strong><small id="activeReportDesc">${item.desc}</small></div></div><div class="report-filter-grid"><div class="field"><label>الشهر</label><input class="input" type="month" value="${month}" id="reportMonth"></div><div class="field"><label>الفرع</label><select class="select" id="reportBranch" onchange="syncReportEmployees()"><option value="">جميع الفروع</option>${getBranches().map(b=>`<option value="${escapeHTML(b)}">${escapeHTML(b)}</option>`).join('')}</select></div><div class="field"><label>القسم الإداري</label><select class="select" id="reportDepartment" onchange="syncReportEmployees()"><option value="">جميع الأقسام</option>${getDepartments().map(d=>`<option value="${escapeHTML(d)}">${escapeHTML(d)}</option>`).join('')}</select></div><div class="field"><label>الموظف</label><select class="select" id="reportEmployee"><option value="">جميع الموظفين</option>${visibleEmployees().map(e=>`<option value="${e.id}">${escapeHTML(e.name)}</option>`).join('')}</select></div></div><div class="report-filter-actions"><button class="btn btn-primary" onclick="refreshReport()">⌕ عرض التقرير</button><button class="btn btn-secondary" onclick="resetReportFilters()">↻ مسح الفلاتر</button><button class="btn btn-secondary" onclick="exportCurrentReport()">⇩ Excel / CSV</button><button class="btn btn-secondary" onclick="printCurrentReport()">⇩ تصدير PDF</button></div></section></div>
  <div id="reportArea" class="report-output-area">${reportAreaByType(currentReportType,month,'','','')}</div>`;
}
function resetReportFilters(){if($('#reportMonth'))$('#reportMonth').value=monthISO();if($('#reportBranch'))$('#reportBranch').value='';if($('#reportDepartment'))$('#reportDepartment').value='';syncReportEmployees();if($('#reportEmployee'))$('#reportEmployee').value='';refreshReport()}
function selectReportType(type){
  if(!REPORT_TYPES[type])return;
  currentReportType=type;
  $$('.report-type-card').forEach(el=>el.classList.toggle('active',el.dataset.reportType===type));
  const item=REPORT_TYPES[type];
  if($('#activeReportIcon'))$('#activeReportIcon').textContent=item.icon;
  if($('#activeReportTitle'))$('#activeReportTitle').textContent=item.label;
  if($('#activeReportDesc'))$('#activeReportDesc').textContent=item.desc;
  refreshReport();
}
function syncReportEmployees(){
  const branch=$('#reportBranch')?.value||'',department=$('#reportDepartment')?.value||'',select=$('#reportEmployee');if(!select)return;
  const current=select.value,list=visibleEmployees().filter(e=>(!branch||e.branch===branch)&&(!department||e.department===department));
  select.innerHTML=`<option value="">جميع الموظفين</option>${list.map(e=>`<option value="${e.id}" ${e.id===current?'selected':''}>${escapeHTML(e.name)}</option>`).join('')}`;
  if(current&&!list.some(e=>e.id===current))select.value='';
}
function getReportFilters(){return {month:$('#reportMonth')?.value||monthISO(),branch:$('#reportBranch')?.value||'',department:$('#reportDepartment')?.value||'',employeeId:$('#reportEmployee')?.value||''}}
function refreshReport(){const f=getReportFilters();if($('#reportArea'))$('#reportArea').innerHTML=reportAreaByType(currentReportType,f.month,f.branch,f.department,f.employeeId)}
function printCurrentReport(){document.body.classList.add('printing-report');window.print();setTimeout(()=>document.body.classList.remove('printing-report'),400)}
function reportAreaByType(type,month,branch='',department='',employeeId=''){
  const ctx=reportContext(month,branch,department,employeeId);
  if(EXTRA_MODULES[type])return renderGenericModuleReport(type,ctx);
  return ({comprehensive:renderComprehensiveReport,employees:renderEmployeesReport,documents:renderDocumentsReport,attendance:renderAttendanceReport,leaves:renderLeavesReport,missions:renderMissionsReport,expenses:renderExpensesReport,adjustments:renderAdjustmentsReport,custody:renderCustodyReport,payroll:renderPayrollReport,branches:renderBranchesReport}[type]||renderComprehensiveReport)(ctx);
}
function reportSection(title,content,subtitle=''){return `<div class="card report-section"><div class="card-title"><div><h3>${title}</h3>${subtitle?`<div class="small muted" style="margin-top:5px">${subtitle}</div>`:''}</div></div>${content}</div>`}
function noReportData(text){return `<div class="empty"><span class="emoji">▤</span>${text}</div>`}

function renderComprehensiveReport(ctx){
  const approvedExpenses=ctx.expenses.filter(x=>x.status==='approved'),approvedRewards=ctx.adjustments.filter(x=>x.status==='approved'&&x.kind==='reward'),approvedDeductions=ctx.adjustments.filter(x=>x.status==='approved'&&x.kind==='deduction'),activeCustodies=ctx.custodies.filter(x=>x.status==='assigned'),financialCustodies=activeCustodies.filter(x=>x.custodyType==='financial');
  const late=ctx.attendance.reduce((s,a)=>s+Number(a.lateMinutes||0),0),ot=ctx.attendance.reduce((s,a)=>s+Number(a.overtimeMinutes||0),0);
  const content=`<div class="grid grid-4">${metric('💳',sumByCurrency(ctx.payroll,p=>p.net,p=>p.employeeId),'صافي الرواتب',ctx.month)}${metric('▣',sumExpensesByCurrency(approvedExpenses),'المصروفات المعتمدة',ctx.month)}${metric('＋',sumByCurrency(approvedRewards),'المكافآت المعتمدة',ctx.month)}${metric('−',sumByCurrency(approvedDeductions),'الخصومات المعتمدة',ctx.month)}</div>
  <div class="grid grid-4" style="margin-top:18px">${metric('✓',ctx.attendance.filter(a=>['present','late'].includes(a.status)).length,'سجلات الحضور',`${late} دقيقة تأخير`)}${metric('☂',ctx.leaves.filter(l=>l.status==='approved').reduce((s,l)=>s+daysOfLeaveInMonth(l,ctx.month),0),'أيام الإجازات','المعتمدة')}${metric('▦',activeCustodies.length,'العُهد النشطة',financialCustodies.length?`رصيد مالي: ${financialCustodySummary(financialCustodies,'remaining')}`:custodyMoneySummary(activeCustodies))}${metric('⌖',ctx.missions.length,'المأموريات',ctx.month)}</div>
  ${reportSection('الرواتب',ctx.payroll.length?payrollReportTable(ctx.payroll):noReportData('لا توجد رواتب محسوبة لهذا الشهر'))}
  <div class="report-two-col">${reportSection('مصروفات الشركة',ctx.expenses.length?expenseReportTable(ctx.expenses,true):noReportData('لا توجد مصروفات شركة'))}${reportSection('الخصومات والمكافآت',ctx.adjustments.length?adjustmentReportTable(ctx.adjustments,true):noReportData('لا توجد حركات مالية'))}</div>
  <div class="report-two-col">${reportSection('الإجازات',ctx.leaves.length?leaveReportTable(ctx.leaves,ctx.month,true):noReportData('لا توجد إجازات'))}${reportSection('العُهد',ctx.custodies.length?custodyReportTable(ctx.custodies,true):noReportData('لا توجد عهد'))}</div>
  ${reportSection('الحضور والانصراف',ctx.attendance.length?attendanceSummaryTable(ctx):noReportData('لا توجد سجلات حضور'))}
  ${reportSection('المأموريات',ctx.missions.length?missionReportTable(ctx.missions):noReportData('لا توجد مأموريات'))}
  ${reportSection('العقود والمستندات',ctx.documents.length?documentReportTable(ctx.documents):noReportData('لا توجد مستندات'))}
  ${renderServicesReportSummary(ctx)}`;
  return reportDocument('التقرير الشامل',ctx,content,'ملخص موحد لكل بنود الموارد البشرية والرواتب والمصروفات والعهد والخدمات الإدارية.');
}
function renderEmployeesReport(ctx){
  const active=ctx.employees.filter(e=>e.status==='active'),accounts=ctx.employees.filter(e=>employeeAccount(e.id)?.active!==false);
  const content=`<div class="grid grid-4">${metric('👥',ctx.employees.length,'إجمالي الموظفين','داخل الفلاتر')}${metric('✓',active.length,'موظفون نشطون','حاليًا')}${metric('⌂',new Set(ctx.employees.map(e=>e.branch)).size,'الفروع','المشمولة')}${metric('🔐',accounts.length,'حسابات مفعلة','للدخول للنظام')}</div>${reportSection('بيانات الموظفين',ctx.employees.length?`<div class="table-wrap"><table class="table report-detail-table"><thead><tr><th>الكود</th><th>الموظف</th><th>المسمى الوظيفي</th><th>القسم</th><th>الفرع</th><th>العملة</th><th>الراتب الأساسي</th><th>الحالة</th><th>الحساب</th></tr></thead><tbody>${ctx.employees.map(e=>{const u=employeeAccount(e.id);return `<tr><td>${escapeHTML(e.code||'-')}</td><td>${escapeHTML(e.name)}</td><td>${escapeHTML(e.jobTitle||'-')}</td><td>${escapeHTML(e.department||'-')}</td><td>${escapeHTML(e.branch||'-')}</td><td>${branchCurrencyLabel(e.branch)}</td><td>${money(e.salary,getBranchCurrency(e.branch))}</td><td>${statusBadge(e.status)}</td><td>${u?`<span class="badge badge-${u.active===false?'danger':'success'}">${u.active===false?'موقوف':'مفعل'}</span>`:'لا يوجد'}</td></tr>`}).join('')}</tbody></table></div>`:noReportData('لا يوجد موظفون داخل الفلاتر'))}`;
  return reportDocument('تقرير الموظفين',ctx,content,'قائمة مستقلة ببيانات الموظفين والأقسام والفروع والرواتب الأساسية.');
}
function attendanceSummaryTable(ctx){return `<div class="table-wrap"><table class="table"><thead><tr><th>الموظف</th><th>القسم</th><th>أيام الحضور</th><th>سجلات التأخير</th><th>دقائق التأخير</th><th>الإضافي</th><th>غياب مسجل</th></tr></thead><tbody>${ctx.employees.map(e=>{const r=ctx.attendance.filter(a=>a.employeeId===e.id);return `<tr><td>${escapeHTML(e.name)}</td><td>${escapeHTML(e.department||'-')}</td><td>${r.filter(a=>['present','late'].includes(a.status)).length}</td><td>${r.filter(a=>a.status==='late').length}</td><td>${r.reduce((s,a)=>s+Number(a.lateMinutes||0),0)}</td><td>${minutesToHM(r.reduce((s,a)=>s+Number(a.overtimeMinutes||0),0))}</td><td>${r.filter(a=>a.status==='absent').length}</td></tr>`}).join('')}</tbody></table></div>`}
function renderAttendanceReport(ctx){
  const lateMinutes=ctx.attendance.reduce((s,a)=>s+Number(a.lateMinutes||0),0),ot=ctx.attendance.reduce((s,a)=>s+Number(a.overtimeMinutes||0),0);
  const content=`<div class="grid grid-4">${metric('✓',ctx.attendance.filter(a=>['present','late'].includes(a.status)).length,'حضور','عدد السجلات')}${metric('⌛',ctx.attendance.filter(a=>a.status==='late').length,'مرات التأخير',`${lateMinutes} دقيقة`)}${metric('＋',minutesToHM(ot),'عمل إضافي','إجمالي الفترة')}${metric('×',ctx.attendance.filter(a=>a.status==='absent').length,'غياب مسجل','داخل الشهر')}</div>${reportSection('التفاصيل اليومية',ctx.attendance.length?`<div class="table-wrap"><table class="table report-detail-table"><thead><tr><th>التاريخ</th><th>الموظف</th><th>القسم</th><th>الفرع</th><th>الدخول</th><th>الخروج</th><th>التأخير</th><th>الإضافي</th><th>الحالة</th><th>المصدر</th></tr></thead><tbody>${[...ctx.attendance].sort((a,b)=>b.date.localeCompare(a.date)).map(a=>{const e=emp(a.employeeId);return `<tr><td>${fmtDate(a.date)}</td><td>${escapeHTML(e?.name||'-')}</td><td>${escapeHTML(e?.department||'-')}</td><td>${escapeHTML(e?.branch||'-')}</td><td>${fmtTime(a.checkIn)}</td><td>${fmtTime(a.checkOut)}</td><td>${a.lateMinutes||0} دقيقة</td><td>${minutesToHM(a.overtimeMinutes||0)}</td><td>${statusBadge(a.status)}</td><td>${(a.source==='manual'||a.location==='إدخال يدوي')?'تسجيل يدوي':'تطبيق الجوال'}</td></tr>`}).join('')}</tbody></table></div>`:noReportData('لا توجد سجلات حضور داخل الفترة'))}${reportSection('ملخص حسب الموظف',ctx.employees.length?attendanceSummaryTable(ctx):noReportData('لا يوجد موظفون'))}`;
  return reportDocument('تقرير الحضور والانصراف',ctx,content,'تفاصيل يومية وملخص التأخير والغياب والعمل الإضافي لكل موظف.');
}
function leaveReportTable(list,month,compact=false){return `<div class="table-wrap"><table class="table ${compact?'compact-table':'report-detail-table'}"><thead><tr><th>الموظف</th><th>القسم</th><th>النوع</th><th>من</th><th>إلى</th><th>أيام الشهر</th><th>المعاملة</th><th>الحالة</th><th>السبب</th></tr></thead><tbody>${list.map(l=>{const e=emp(l.employeeId);return `<tr><td>${escapeHTML(e?.name||'-')}</td><td>${escapeHTML(e?.department||'-')}</td><td>${escapeHTML(l.type)}</td><td>${fmtDate(l.from)}</td><td>${fmtDate(l.to)}</td><td>${daysOfLeaveInMonth(l,month)}</td><td><span class="badge badge-${l.paid===false?'danger':'success'}">${l.paid===false?'بدون راتب':'مدفوعة'}</span></td><td>${statusBadge(l.status)}</td><td>${escapeHTML(l.reason||'-')}</td></tr>`}).join('')}</tbody></table></div>`}
function renderLeavesReport(ctx){
  const approved=ctx.leaves.filter(l=>l.status==='approved'),unpaid=approved.filter(l=>l.paid===false),approvedDays=approved.reduce((s,l)=>s+daysOfLeaveInMonth(l,ctx.month),0),unpaidDays=unpaid.reduce((s,l)=>s+daysOfLeaveInMonth(l,ctx.month),0);
  const content=`<div class="grid grid-4">${metric('☂',ctx.leaves.length,'طلبات الإجازة','كل الحالات')}${metric('✓',approvedDays,'أيام معتمدة','داخل الشهر')}${metric('◉',unpaidDays,'أيام بدون راتب','تدخل في الخصم')}${metric('⌛',ctx.leaves.filter(l=>l.status==='pending').length,'طلبات معلقة','تحتاج مراجعة')}</div>${reportSection('تفاصيل الإجازات',ctx.leaves.length?leaveReportTable(ctx.leaves,ctx.month):noReportData('لا توجد إجازات داخل الفترة'))}`;
  return reportDocument('تقرير الإجازات',ctx,content,'تقرير مستقل لأنواع الإجازات ومدتها ومعاملتها المالية وحالة كل طلب.');
}
function missionReportTable(list){return `<div class="table-wrap"><table class="table report-detail-table"><thead><tr><th>التاريخ</th><th>الموظف</th><th>القسم</th><th>الفرع</th><th>العنوان</th><th>الموقع</th><th>من</th><th>إلى</th><th>الحالة</th><th>ملاحظات</th></tr></thead><tbody>${list.map(m=>{const e=emp(m.employeeId);return `<tr><td>${fmtDate(m.date)}</td><td>${escapeHTML(e?.name||'-')}</td><td>${escapeHTML(e?.department||'-')}</td><td>${escapeHTML(e?.branch||'-')}</td><td>${escapeHTML(m.title||'-')}</td><td>${escapeHTML(m.location||'-')}</td><td>${escapeHTML(m.from||'-')}</td><td>${escapeHTML(m.to||'-')}</td><td>${statusBadge(m.status)}</td><td>${escapeHTML(m.notes||'-')}</td></tr>`}).join('')}</tbody></table></div>`}
function renderMissionsReport(ctx){
  const content=`<div class="grid grid-4">${metric('⌖',ctx.missions.length,'إجمالي المأموريات','داخل الشهر')}${metric('✓',ctx.missions.filter(m=>m.status==='approved').length,'معتمدة','تمت الموافقة')}${metric('⌛',ctx.missions.filter(m=>m.status==='pending').length,'معلقة','بانتظار القرار')}${metric('×',ctx.missions.filter(m=>m.status==='rejected').length,'مرفوضة','داخل الشهر')}</div>${reportSection('تفاصيل المأموريات',ctx.missions.length?missionReportTable(ctx.missions):noReportData('لا توجد مأموريات داخل الفترة'))}`;
  return reportDocument('تقرير المأموريات',ctx,content,'المواقع والمواعيد وحالة كل مأمورية خارجية.');
}
function expenseReportTable(list,compact=false){return `<div class="table-wrap"><table class="table ${compact?'compact-table':'report-detail-table'}"><thead><tr><th>التاريخ</th><th>اسم المصروف</th><th>الفرع</th><th>العملة</th><th>الفئة</th><th>العهدة المالية</th><th>المورد / الجهة</th><th>طريقة الدفع</th><th>رقم الفاتورة</th><th>الوصف</th><th>المبلغ</th><th>الحالة</th><th>المرفق</th></tr></thead><tbody>${list.map(x=>`<tr><td>${fmtDate(x.date)}</td><td><strong>${escapeHTML(x.title||'مصروف شركة')}</strong></td><td>${escapeHTML(expenseBranch(x)||'-')}</td><td>${expenseCurrency(x)}</td><td>${escapeHTML(x.category||'-')}</td><td>${escapeHTML(expenseCustodyLabel(x))}</td><td>${escapeHTML(x.supplier||'-')}</td><td>${escapeHTML(x.paymentMethod||'-')}</td><td>${escapeHTML(x.invoiceNo||'-')}</td><td>${escapeHTML(x.description||'-')}</td><td>${moneyForExpense(x)}</td><td>${statusBadge(x.status)}</td><td>${escapeHTML(x.attachmentName||'-')}</td></tr>`).join('')}</tbody></table></div>`}
function renderExpensesReport(ctx){
  const approved=ctx.expenses.filter(x=>x.status==='approved'),pending=ctx.expenses.filter(x=>x.status==='pending'),rejected=ctx.expenses.filter(x=>x.status==='rejected');
  const content=`<div class="grid grid-4">${metric('▣',sumExpensesByCurrency(ctx.expenses),'إجمالي مصروفات الشركة','كل الحالات')}${metric('✓',sumExpensesByCurrency(approved),'المعتمد','داخل الشهر')}${metric('⌛',sumExpensesByCurrency(pending),'قيد المراجعة',`${pending.length} مصروف`)}${metric('×',rejected.length,'مرفوضة','عدد السجلات')}</div>${reportSection('تفاصيل مصروفات الشركة',ctx.expenses.length?expenseReportTable(ctx.expenses):noReportData('لا توجد مصروفات داخل الفترة'),'مصروفات الشركة تُفلتر حسب الشهر والفرع، وقد ترتبط بعهدة مالية دون تكرار احتسابها.')}`;
  return reportDocument('تقرير مصروفات الشركة',ctx,content,'كل المصروفات التشغيلية والفروع والعملات والموردين والمرفقات وحالة الاعتماد.');
}
function adjustmentReportTable(list,compact=false){return `<div class="table-wrap"><table class="table ${compact?'compact-table':'report-detail-table'}"><thead><tr><th>التاريخ</th><th>الموظف</th><th>القسم</th><th>الفرع</th><th>الحركة</th><th>نوع الخصم / المكافأة</th><th>طريقة الحساب</th><th>السبب</th><th>المبلغ</th><th>الحالة</th></tr></thead><tbody>${list.map(x=>{const e=emp(x.employeeId);return `<tr><td>${fmtDate(x.date)}</td><td>${escapeHTML(e?.name||'-')}</td><td>${escapeHTML(e?.department||'-')}</td><td>${escapeHTML(e?.branch||'-')}</td><td><span class="badge badge-${x.kind==='reward'?'success':'danger'}">${adjustmentKindLabel(x.kind)}</span></td><td>${escapeHTML(adjustmentTypeLabel(x))}</td><td>${escapeHTML(adjustmentMethodLabel(x))}</td><td>${escapeHTML(x.reason||'-')}</td><td><strong class="${x.kind==='reward'?'positive-text':'negative-text'}">${x.kind==='reward'?'+':'−'} ${moneyForEmployee(x.amount,x.employeeId)}</strong></td><td>${statusBadge(x.status)}</td></tr>`}).join('')}</tbody></table></div>`}
function renderAdjustmentsReport(ctx){
  const rewards=ctx.adjustments.filter(x=>x.kind==='reward'),deductions=ctx.adjustments.filter(x=>x.kind==='deduction'),approvedRewards=rewards.filter(x=>x.status==='approved'),approvedDeductions=deductions.filter(x=>x.status==='approved');
  const content=`<div class="grid grid-4">${metric('＋',sumByCurrency(approvedRewards),'مكافآت معتمدة','تضاف للراتب')}${metric('−',sumByCurrency(approvedDeductions),'خصومات معتمدة','تخصم من الراتب')}${metric('⌛',ctx.adjustments.filter(x=>x.status==='pending').length,'حركات معلقة','تحتاج مراجعة')}${metric('±',ctx.adjustments.length,'إجمالي الحركات','كل الحالات')}</div>${reportSection('تفاصيل الخصومات والمكافآت',ctx.adjustments.length?adjustmentReportTable(ctx.adjustments):noReportData('لا توجد خصومات أو مكافآت داخل الفترة'))}`;
  return reportDocument('تقرير الخصومات والمكافآت',ctx,content,'الحركات المالية الإضافية المعتمدة والمعلقة والمرفوضة.');
}
function custodyReportTable(list,compact=false){return `<div class="table-wrap"><table class="table ${compact?'compact-table':'report-detail-table'}"><thead><tr><th>النوع</th><th>الموظف</th><th>القسم</th><th>الفرع المستلم</th><th>العهدة</th><th>الرقم</th><th>القيمة الأصلية</th><th>المصروف المعتمد</th><th>المعلق</th><th>الرصيد / القيمة</th><th>التسليم</th><th>الرد / التسوية</th><th>الحالة</th></tr></thead><tbody>${list.map(x=>{const e=emp(x.employeeId),isFin=x.custodyType==='financial',total=custodyTotalValue(x);return `<tr><td>${custodyTypeLabel(x)}</td><td>${escapeHTML(e?.name||'-')}</td><td>${escapeHTML(e?.department||'-')}</td><td>${escapeHTML(custodyBranch(x)||'-')}</td><td>${escapeHTML(x.item||'-')}</td><td>${escapeHTML(x.serial||'-')}</td><td>${money(total,custodyCurrency(x))}</td><td>${isFin?money(custodyApprovedSpent(x),custodyCurrency(x)):'—'}</td><td>${isFin?money(custodyPendingSpent(x),custodyCurrency(x)):'—'}</td><td>${money(isFin?custodyRemaining(x):total,custodyCurrency(x))}</td><td>${fmtDate(x.assignedDate)}</td><td>${fmtDate(x.returnDate)}</td><td>${custodyStatusBadge(x)}</td></tr>`}).join('')}</tbody></table></div>`}
function renderCustodyReport(ctx){
  const active=ctx.custodies.filter(x=>x.status==='assigned'),financial=active.filter(x=>x.custodyType==='financial'),assets=active.filter(x=>x.custodyType!=='financial'),closed=ctx.custodies.filter(x=>x.status==='returned');
  const content=`<div class="grid grid-4">${metric('💵',financial.length,'عهد مالية مفتوحة',financialCustodySummary(financial,'remaining'))}${metric('▣',financialCustodySummary(financial,'spent'),'مصروفات معتمدة من العهد','محتسبة مرة واحدة في المصروفات')}${metric('▦',assets.length,'عهد عينية نشطة',assetCustodyMoneySummary(assets))}${metric('✓',closed.length,'تمت التسوية / الرد','عهد مغلقة')}</div>${reportSection('تفاصيل العُهد',ctx.custodies.length?custodyReportTable(ctx.custodies):noReportData('لا توجد عهد داخل النطاق'),'العهدة المالية مرجع للتمويل؛ إجمالي المصروفات يعتمد على الحركات المرتبطة المعتمدة فقط.')}`;
  return reportDocument('تقرير العُهد',ctx,content,'العهد المالية المرتبطة بالمصروفات والعهد العينية، مع الرصيد والتسويات وحالة كل عهدة.');
}
function renderPayrollReport(ctx){
  const paid=ctx.payroll.filter(p=>['paid','locked'].includes(p.status)),draft=ctx.payroll.filter(p=>!['paid','locked'].includes(p.status));
  const content=`<div class="grid grid-4">${metric('💳',sumByCurrency(ctx.payroll,p=>p.net,p=>p.employeeId),'صافي الرواتب','إجمالي الشهر')}${metric('✓',sumByCurrency(paid,p=>p.net,p=>p.employeeId),'تم صرفه',`${paid.length} موظف`)}${metric('⌛',sumByCurrency(draft,p=>p.net,p=>p.employeeId),'غير مصروف',`${draft.length} موظف`)}${metric('−',sumByCurrency(ctx.payroll,p=>p.deductions,p=>p.employeeId),'إجمالي الخصومات','كل الأنواع')}</div>${reportSection('تفاصيل مرتبات الشهر',ctx.payroll.length?payrollReportTable(ctx.payroll):noReportData('لا توجد رواتب محسوبة لهذا الشهر'))}`;
  return reportDocument('تقرير الرواتب',ctx,content,'تفصيل الراتب الأساسي والإضافي والمكافآت وكل أنواع الخصم وصافي المستحق.');
}
function renderBranchesReport(ctx){
  const branches=getBranches().filter(b=>!ctx.branch||b===ctx.branch);
  const rows=branches.map(b=>{const es=ctx.employees.filter(e=>e.branch===b),ids=es.map(e=>e.id),prs=ctx.payroll.filter(p=>ids.includes(p.employeeId)),ex=ctx.expenses.filter(x=>expenseBranch(x)===b),adj=ctx.adjustments.filter(x=>ids.includes(x.employeeId)),cu=ctx.custodies.filter(x=>custodyBranch(x)===b);return {branch:b,employees:es,payroll:prs,expenses:ex,adjustments:adj,custodies:cu}});
  const content=`<div class="grid grid-4">${metric('⌂',rows.length,'الفروع','داخل الفلاتر')}${metric('👥',ctx.employees.length,'الموظفون','في الفروع')}${metric('💳',sumByCurrency(ctx.payroll,p=>p.net,p=>p.employeeId),'صافي الرواتب',ctx.month)}${metric('▣',sumExpensesByCurrency(ctx.expenses.filter(x=>x.status==='approved')),'المصروفات المعتمدة',ctx.month)}</div>${reportSection('ملخص كل فرع',rows.length?`<div class="table-wrap"><table class="table report-detail-table"><thead><tr><th>الفرع</th><th>العملة</th><th>الموظفون</th><th>الأقسام</th><th>صافي الرواتب</th><th>المصروفات المعتمدة</th><th>المكافآت</th><th>الخصومات</th><th>العهد النشطة</th><th>رصيد العهد المالية / قيمة العينية</th></tr></thead><tbody>${rows.map(r=>{const active=r.custodies.filter(x=>x.status==='assigned'),rewards=r.adjustments.filter(x=>x.status==='approved'&&x.kind==='reward'),deductions=r.adjustments.filter(x=>x.status==='approved'&&x.kind==='deduction');return `<tr><td><strong>${escapeHTML(r.branch)}</strong></td><td>${branchCurrencyLabel(r.branch)}</td><td>${r.employees.length}</td><td>${new Set(r.employees.map(e=>e.department)).size}</td><td>${sumByCurrency(r.payroll,p=>p.net,p=>p.employeeId)}</td><td>${sumExpensesByCurrency(r.expenses.filter(x=>x.status==='approved'))}</td><td>${sumByCurrency(rewards)}</td><td>${sumByCurrency(deductions)}</td><td>${active.length}</td><td>${custodyMoneySummary(active)}</td></tr>`}).join('')}</tbody></table></div>`:noReportData('لا توجد فروع داخل الفلاتر'))}`;
  return reportDocument('تقرير الفروع والعملات',ctx,content,'نتيجة مستقلة لكل فرع تشمل العملة والموظفين والرواتب والمصروفات والعهد.');
}

function reportExportData(type,ctx){
  if(EXTRA_MODULES[type])return genericModuleExportData(type,ctx);
  const eInfo=id=>{const e=emp(id);return [e?.code||'',e?.name||'',e?.department||'',e?.branch||'']};
  if(type==='employees')return {headers:['الكود','الموظف','المسمى الوظيفي','القسم','الفرع','الهوية','نوع العقد','بداية العقد','نهاية العقد','الرقم التأميني','الرقم الضريبي','خصم التأمين','خصم الضريبة','العملة','الراتب الأساسي','الحالة','حالة الحساب'],rows:ctx.employees.map(e=>[e.code,e.name,e.jobTitle,e.department,e.branch,e.nationalId||'',e.contractType||'',e.contractStart||'',e.contractEnd||'',e.insuranceNumber||'',e.taxNumber||'',e.insuranceDeduction||0,e.taxDeduction||0,getBranchCurrency(e.branch),e.salary,statusText(e.status),employeeAccount(e.id)?(employeeAccount(e.id).active===false?'موقوف':'مفعل'):'لا يوجد'])};
  if(type==='documents')return {headers:['الكود','الموظف','القسم','الفرع','الفئة','عنوان المستند','الرقم','تاريخ الإصدار','تاريخ الانتهاء','الحالة','المرفق','ملاحظات'],rows:ctx.documents.map(x=>[...eInfo(x.employeeId),x.category,x.title,x.number||'',x.issueDate||'',x.expiryDate||'',documentStatusText(x),x.attachmentName||'',x.notes||''])};
  if(type==='attendance')return {headers:['الكود','الموظف','القسم','الفرع','التاريخ','الدخول','الخروج','الحالة','دقائق التأخير','دقائق الإضافي','موقع الحضور','موقع الانصراف','المصدر'],rows:ctx.attendance.map(a=>[...eInfo(a.employeeId),a.date,fmtTime(a.checkIn),fmtTime(a.checkOut),statusText(a.status),a.lateMinutes||0,a.overtimeMinutes||0,a.location||'',a.checkOutLocation||'',(a.source==='manual'||a.location==='إدخال يدوي')?'تسجيل يدوي':'تطبيق الجوال'])};
  if(type==='leaves')return {headers:['الكود','الموظف','القسم','الفرع','نوع الإجازة','من','إلى','أيام الشهر','المعاملة المالية','الحالة','السبب'],rows:ctx.leaves.map(l=>[...eInfo(l.employeeId),l.type,l.from,l.to,daysOfLeaveInMonth(l,ctx.month),l.paid===false?'بدون راتب':'مدفوعة',statusText(l.status),l.reason||''])};
  if(type==='missions')return {headers:['الكود','الموظف','القسم','الفرع','التاريخ','العنوان','الموقع','من','إلى','الحالة','ملاحظات'],rows:ctx.missions.map(m=>[...eInfo(m.employeeId),m.date,m.title,m.location,m.from,m.to,statusText(m.status),m.notes||''])};
  if(type==='expenses')return {headers:['التاريخ','اسم المصروف','الفرع','الفئة','العهدة المالية','المورد / الجهة','طريقة الدفع','رقم الفاتورة','الوصف','المبلغ','العملة','الحالة','المرفق'],rows:ctx.expenses.map(x=>[x.date,x.title||'',expenseBranch(x),x.category||'',expenseCustodyLabel(x),x.supplier||'',x.paymentMethod||'',x.invoiceNo||'',x.description||'',x.amount,expenseCurrency(x),statusText(x.status),x.attachmentName||''])};
  if(type==='adjustments')return {headers:['الكود','الموظف','القسم','الفرع','التاريخ','الحركة','نوع الخصم / المكافأة','طريقة الحساب','عدد الأيام','أجر اليوم','أساس أيام العمل','السبب','المبلغ','العملة','الحالة'],rows:ctx.adjustments.map(x=>[...eInfo(x.employeeId),x.date,adjustmentKindLabel(x.kind),adjustmentTypeLabel(x),x.calculationMethod==='days'?'حسب الأيام':'مبلغ ثابت',x.days||0,x.dailyRate||0,x.workDaysBasis||0,x.reason,x.amount,employeeCurrency(x.employeeId),statusText(x.status)])};
  if(type==='custody')return {headers:['الكود','الموظف المسؤول','القسم','الفرع المستلم','نوع العهدة','العهدة','الرقم/السيريال','القيمة الأصلية','المصروف المعتمد','المصروف المعلق','المرتجع للخزينة','الرصيد/القيمة الحالية','العملة','تاريخ التسليم','تاريخ الرد/التسوية','الحالة','ملاحظات'],rows:ctx.custodies.map(x=>{const e=emp(x.employeeId);return [e?.code||'',e?.name||'',e?.department||'',custodyBranch(x),custodyTypeLabel(x),x.item,x.serial||'',custodyTotalValue(x),x.custodyType==='financial'?custodyApprovedSpent(x):0,x.custodyType==='financial'?custodyPendingSpent(x):0,x.returnedCash||0,x.custodyType==='financial'?custodyRemaining(x):custodyTotalValue(x),custodyCurrency(x),x.assignedDate,x.returnDate||'',custodyStatusLabel(x.status,x),x.notes||'']})};
  if(type==='payroll')return {headers:['الكود','الموظف','القسم','الفرع','الشهر','نطاق الحساب','نهاية الفترة','العملة','الراتب الشهري','الأساسي المستحق','الإضافي','المكافآت','إجمالي الاستحقاقات','خصم التأخير','خصم الغياب','خصم بدون راتب','خصومات إدارية','التأمينات','الضرائب','إجمالي الخصم','الصافي','أيام الاستحقاق','أيام الشهر المجدولة','الحالة'],rows:ctx.payroll.map(p=>[...eInfo(p.employeeId),p.month,p.calculationMode==='to_date'?'حتى اليوم':'شهر كامل',p.periodEnd||'',p.currency||employeeCurrency(p.employeeId),p.contractBase||p.base,p.base,p.overtime,p.rewards||0,p.gross||Number(p.base||0)+Number(p.overtime||0)+Number(p.rewards||0),p.lateDed||0,p.absenceDed||0,p.unpaidLeaveDed||0,p.manualDeductions||0,p.insuranceDeduction||0,p.taxDeduction||0,p.deductions,p.net,p.eligibleDays||0,p.scheduledDays||0,statusText(p.status)])};
  if(type==='branches'){
    const rows=getBranches().filter(b=>!ctx.branch||b===ctx.branch).map(b=>{const es=ctx.employees.filter(e=>e.branch===b),ids=es.map(e=>e.id),prs=ctx.payroll.filter(p=>ids.includes(p.employeeId)),ex=ctx.expenses.filter(x=>expenseBranch(x)===b&&x.status==='approved'),adj=ctx.adjustments.filter(x=>ids.includes(x.employeeId)&&x.status==='approved'),cu=ctx.custodies.filter(x=>custodyBranch(x)===b&&x.status==='assigned'),code=getBranchCurrency(b);return [b,code,currencyLabel(code),es.length,new Set(es.map(e=>e.department)).size,prs.reduce((s,p)=>s+Number(p.net||0),0),ex.reduce((s,x)=>s+Number(x.amount||0),0),adj.filter(x=>x.kind==='reward').reduce((s,x)=>s+Number(x.amount||0),0),adj.filter(x=>x.kind==='deduction').reduce((s,x)=>s+Number(x.amount||0),0),cu.length,cu.reduce((s,x)=>s+(x.custodyType==='financial'?custodyRemaining(x):custodyTotalValue(x)),0)]});
    return {headers:['الفرع','كود العملة','اسم العملة','الموظفون','عدد الأقسام','صافي الرواتب','المصروفات المعتمدة','المكافآت','الخصومات','العهد النشطة','رصيد العهد المالية / قيمة العينية'],rows};
  }
  const rows=[],push=(section,employee,date,description,amount,currency,status,extra='')=>rows.push([section,employee,date,description,amount,currency,status,extra]);
  ctx.attendance.forEach(a=>push('الحضور',emp(a.employeeId)?.name,a.date,`دخول ${fmtTime(a.checkIn)} / خروج ${fmtTime(a.checkOut)}`,'','',statusText(a.status),`تأخير ${a.lateMinutes||0} دقيقة - إضافي ${a.overtimeMinutes||0} دقيقة`));
  ctx.leaves.forEach(l=>push('الإجازات',emp(l.employeeId)?.name,l.from,`${l.type} من ${l.from} إلى ${l.to}`,daysOfLeaveInMonth(l,ctx.month),'يوم',statusText(l.status),l.paid===false?'بدون راتب':'مدفوعة'));
  ctx.expenses.forEach(x=>push('مصروفات الشركة',expenseBranch(x),x.date,`${x.title||x.category}: ${x.description||''}`,x.amount,expenseCurrency(x),statusText(x.status),`${x.custodyId?'عهدة: '+expenseCustodyLabel(x)+' · ':''}${x.attachmentName||''}`));
  ctx.adjustments.forEach(x=>push(adjustmentKindLabel(x.kind),emp(x.employeeId)?.name,x.date,`${deductionTypeLabel(x)} · ${x.reason}`,x.amount,employeeCurrency(x.employeeId),statusText(x.status),adjustmentMethodLabel(x)));
  ctx.payroll.forEach(p=>push('الرواتب',emp(p.employeeId)?.name,p.month,'صافي الراتب',p.net,p.currency||employeeCurrency(p.employeeId),statusText(p.status),`أساسي ${p.base} - مكافآت ${p.rewards||0} - خصومات ${p.deductions}`));
  ctx.custodies.forEach(x=>push('العهد',emp(x.employeeId)?.name,x.assignedDate,`${custodyTypeLabel(x)}: ${x.item} / ${x.serial||'-'}`,x.custodyType==='financial'?custodyRemaining(x):custodyTotalValue(x),custodyCurrency(x),custodyStatusLabel(x.status,x),x.custodyType==='financial'?`مصروف معتمد ${custodyApprovedSpent(x)} · الرصيد لا يُضاف لإجمالي المصروفات`:`الكمية ${x.quantity||1}`));
  ctx.documents.forEach(x=>push('العقود والمستندات',emp(x.employeeId)?.name,x.expiryDate||x.issueDate,`${x.category}: ${x.title}`,'','',documentStatusText(x),x.attachmentName||''));
  ctx.missions.forEach(m=>push('المأموريات',emp(m.employeeId)?.name,m.date,`${m.title} - ${m.location}`,'','',statusText(m.status),`${m.from} إلى ${m.to}`));
  return {headers:['القسم','الموظف / الفرع','التاريخ','البيان','المبلغ/العدد','العملة/الوحدة','الحالة','تفاصيل إضافية'],rows};
}
function exportCurrentReport(){
  const f=getReportFilters(),ctx=reportContext(f.month,f.branch,f.department,f.employeeId),data=reportExportData(currentReportType,ctx),slug=currentReportType||'report';
  downloadCSV(`orbit-${slug}-report-${f.month}.csv`,data.headers,data.rows);
}

const SETTINGS_GROUPS={company:{icon:'🏢',label:'المنشأة والهيكل',desc:'هوية الشركة والفروع والأقسام'},policies:{icon:'◷',label:'الحضور والرواتب',desc:'سياسات الدوام والحسابات'},finance:{icon:'▣',label:'الإعدادات المالية',desc:'المصروفات والخصومات والمكافآت'},documents:{icon:'📁',label:'المستندات والعقود',desc:'فئات المستندات وإدارة التصنيف'},permissions:{icon:'🔐',label:'الأدوار والصلاحيات',desc:'صلاحيات HR والمالية والأدوار المخصصة'},leaves:{icon:'☂',label:'الإجازات والأرصدة',desc:'الأنواع والمعاملة المالية'},system:{icon:'🛡',label:'النظام والنسخ الاحتياطي',desc:'الحماية والاسترجاع والجاهزية'}};
function setSettingsGroup(group){if(SETTINGS_GROUPS[group])settingsActiveGroup=group;render()}
function settingsNavButton(key){const g=SETTINGS_GROUPS[key];return `<button class="settings-nav-btn ${settingsActiveGroup===key?'active':''}" type="button" onclick="setSettingsGroup('${key}')"><span>${g.icon}</span><div><strong>${g.label}</strong><small>${g.desc}</small></div><b>←</b></button>`}
function renderSettings(){const s=state.settings;if(!SETTINGS_GROUPS[settingsActiveGroup])settingsActiveGroup='company';const content={company:renderSettingsCompany(s),policies:renderSettingsPolicies(s),finance:renderSettingsFinance(s),documents:renderSettingsDocuments(s),permissions:renderSettingsPermissions(s),leaves:renderSettingsLeaves(s),system:renderSettingsSystem(s)}[settingsActiveGroup];return `<section class="settings-page"><div class="settings-hero"><div><span class="page-eyebrow">لوحة التحكم المركزية</span><h2>إعدادات النظام</h2><p>تم تقسيم الإعدادات إلى مجموعات مستقلة لتسهيل الإدارة وتقليل التشتت.</p></div><div class="settings-hero-actions"><span class="settings-version">الإصدار ${APP_VERSION}</span><button class="btn btn-light" onclick="resetDemo()">إعادة بيانات التجربة</button></div></div><div class="settings-layout"><aside class="settings-nav card"><div class="settings-nav-title"><strong>أقسام الإعدادات</strong><small>اختر القسم المطلوب</small></div>${Object.keys(SETTINGS_GROUPS).map(settingsNavButton).join('')}</aside><main class="settings-content">${content}</main></div></section>`}
function settingsPanelHeader(icon,title,desc){return `<div class="settings-panel-head"><span>${icon}</span><div><h3>${title}</h3><p>${desc}</p></div></div>`}
function renderSettingsCompany(s){return `<div class="settings-panel">${settingsPanelHeader('🏢','المنشأة والهيكل الإداري','بيانات الشركة، العملات، الفروع، والأقسام التنظيمية.')}<div class="settings-section-grid"><form class="card settings-section-card" onsubmit="saveSettings(event)"><div class="card-title"><div><h3>هوية المنشأة</h3><div class="small muted">البيانات الأساسية الظاهرة في النظام والتقارير</div></div></div><div class="form-grid">${field('اسم الشركة','company',s.company,'text',true)}<div class="field"><label>العملة الافتراضية للفروع الجديدة</label><select class="select" name="currency">${currencyOptions(s.currency)}</select><div class="help">يمكن اختيار عملة مختلفة ومستقلة لكل فرع.</div></div></div><button class="btn btn-primary settings-save-btn">حفظ بيانات المنشأة</button></form><div class="card settings-section-card full-span"><div class="card-title"><div><h3>الفروع والعملات</h3><div class="small muted">كل فرع له عملة مستقلة تستخدم في الرواتب والمصروفات والعهد</div></div><span class="settings-count">${getBranches().length} فروع</span></div><div class="branch-add-grid"><div class="field"><label>اسم الفرع الجديد</label><input class="input" id="newBranch" placeholder="مثال: فرع الرياض"></div><div class="field"><label>عملة الفرع</label><select class="select" id="newBranchCurrency">${currencyOptions(s.currency)}</select></div><button class="btn btn-primary" type="button" onclick="addOrgItem('branch')">＋ إضافة الفرع</button></div><div class="branch-list">${getBranches().map(branchCard).join('')}</div><div class="notice settings-notice">العهدة تعتمد على الفرع المستلم، بينما المصروفات المرتبطة تُسجل من صفحة مصروفات الشركة.</div></div><div class="card settings-section-card full-span"><div class="card-title"><div><h3>الأقسام الإدارية</h3><div class="small muted">الأقسام المتاحة عند إضافة أو تعديل الموظفين</div></div><span class="settings-count">${getDepartments().length} أقسام</span></div><div class="org-add"><input class="input" id="newDepartment" placeholder="اسم القسم الجديد" onkeydown="if(event.key==='Enter'){event.preventDefault();addOrgItem('department')}"><button class="btn btn-primary" type="button" onclick="addOrgItem('department')">＋ إضافة القسم</button></div><div class="org-tags settings-org-tags">${getDepartments().map(v=>orgTag('department',v)).join('')}</div></div></div></div>`}
function renderSettingsPolicies(s){return `<div class="settings-panel">${settingsPanelHeader('◷','سياسات الحضور والرواتب','إعداد قواعد ساعات العمل والتأخير والإضافي والتحقق من الموقع.')}<form class="card settings-section-card" onsubmit="saveSettings(event)"><div class="settings-subsection"><div class="settings-subsection-title"><span>💳</span><div><strong>سياسات احتساب الرواتب</strong><small>الحساب المرتبط بالراتب يعتمد على ساعات الوردية الفعلية لكل شهر</small></div></div><div class="form-grid">${field('أيام العمل الافتراضية عند عدم وجود وردية','workDays',s.workDays,'number',true)}<div class="field"><label>احتساب خصم التأخير</label><select class="select" name="lateDeductionMethod"><option value="salary" ${s.lateDeductionMethod==='salary'?'selected':''}>من أجر الدقيقة حسب الراتب والوردية</option><option value="fixed" ${s.lateDeductionMethod==='fixed'?'selected':''}>قيمة ثابتة لكل دقيقة</option></select></div>${field('قيمة دقيقة التأخير الثابتة','lateDeductionPerMinute',s.lateDeductionPerMinute,'number',true)}<div class="field"><label>احتساب العمل الإضافي</label><select class="select" name="overtimeCalculationMethod"><option value="salary" ${s.overtimeCalculationMethod==='salary'?'selected':''}>أجر الساعة من الراتب × معامل إضافي</option><option value="fixed" ${s.overtimeCalculationMethod==='fixed'?'selected':''}>قيمة ثابتة لكل ساعة</option></select></div>${field('معامل العمل الإضافي','overtimeMultiplier',s.overtimeMultiplier||1.5,'number',true)}${field('قيمة ساعة الإضافي الثابتة','overtimeRatePerHour',s.overtimeRatePerHour,'number',true)}<div class="field"><label>احتساب الشهر الجاري افتراضيًا</label><select class="select" name="currentMonthPayrollMode"><option value="to_date" ${s.currentMonthPayrollMode==='to_date'?'selected':''}>حتى اليوم — استحقاق نسبي</option><option value="full" ${s.currentMonthPayrollMode==='full'?'selected':''}>الشهر كاملًا</option></select></div></div><div class="notice settings-notice">يتم احتساب الغياب والإجازة بدون راتب من دقائق العمل المجدولة فعليًا، ولا تُعتبر الأيام المستقبلية غيابًا عند اختيار «حتى اليوم».</div></div><div class="settings-subsection"><div class="settings-subsection-title"><span>⌖</span><div><strong>سياسات الحضور والتحقق</strong><small>إعداد الموقع ونطاق التسجيل ومتطلبات التحقق</small></div></div><div class="form-grid">${field('نطاق الموقع بالمتر','geofenceRadius',s.geofenceRadius,'number',true)}${field('خط العرض للمقر','geofenceLat',s.geofenceLat,'number',true)}${field('خط الطول للمقر','geofenceLng',s.geofenceLng,'number',true)}<div class="field"><label>إلزام إثبات الكاميرا</label><select class="select" name="requireFace"><option value="false" ${!s.requireFace?'selected':''}>لا</option><option value="true" ${s.requireFace?'selected':''}>نعم</option></select></div><div class="field"><label>إلزام GPS</label><select class="select" name="requireGPS"><option value="false" ${!s.requireGPS?'selected':''}>لا</option><option value="true" ${s.requireGPS?'selected':''}>نعم</option></select></div></div></div><button class="btn btn-primary settings-save-btn">حفظ سياسات الحضور والرواتب</button></form><div class="settings-tip"><span>💡</span><div><strong>الورديات التفصيلية</strong><p>تحديد أيام وساعات العمل لكل وردية يتم من صفحة «الورديات»، وتستخدم مباشرة في حساب أجر الدقيقة والغياب والإضافي.</p><button class="link-btn" type="button" onclick="go('shifts')">فتح الورديات ←</button></div></div></div>`}
function renderSettingsFinance(s){return `<div class="settings-panel">${settingsPanelHeader('▣','الإعدادات المالية','إدارة التصنيفات التي تظهر داخل المصروفات والحركات المالية.')}<div class="settings-section-grid"><div class="card settings-section-card full-span"><div class="card-title"><div><h3>فئات المصروفات</h3><div class="small muted">تظهر تلقائيًا في نموذج مصروفات الشركة والتقارير</div></div><span class="settings-count">${getExpenseCategories().length} فئات</span></div><div class="expense-category-add"><div class="field"><label>اسم الفئة الجديدة</label><input class="input" id="newExpenseCategory" placeholder="مثال: تأمينات ومصاريف حكومية" onkeydown="if(event.key==='Enter'){event.preventDefault();addExpenseCategory()}"></div><button class="btn btn-primary" type="button" onclick="addExpenseCategory()">＋ إضافة الفئة</button></div><div class="expense-category-list professional-list">${getExpenseCategories().map(expenseCategoryCard).join('')}</div></div><div class="card settings-section-card"><div class="card-title"><div><h3>أنواع الخصومات</h3><div class="small muted">مبلغ ثابت أو احتساب بعدد الأيام</div></div><span class="settings-count">${getDeductionTypes().length}</span></div><div class="expense-category-add"><div class="field"><label>نوع خصم جديد</label><input class="input" id="newDeductionType" placeholder="مثال: مخالفة لائحة العمل" onkeydown="if(event.key==='Enter'){event.preventDefault();addDeductionType()}"></div><button class="btn btn-primary" type="button" onclick="addDeductionType()">＋ إضافة</button></div><div class="expense-category-list professional-list">${getDeductionTypes().map(deductionTypeCard).join('')}</div></div><div class="card settings-section-card"><div class="card-title"><div><h3>أنواع المكافآت</h3><div class="small muted">تظهر عند اختيار مكافأة في الحركة المالية</div></div><span class="settings-count">${getRewardTypes().length}</span></div><div class="expense-category-add"><div class="field"><label>نوع مكافأة جديد</label><input class="input" id="newRewardType" placeholder="مثال: حافز إنجاز مشروع" onkeydown="if(event.key==='Enter'){event.preventDefault();addRewardType()}"></div><button class="btn btn-primary" type="button" onclick="addRewardType()">＋ إضافة</button></div><div class="expense-category-list professional-list">${getRewardTypes().map(rewardTypeCard).join('')}</div></div></div></div>`}
function renderSettingsLeaves(s){return `<div class="settings-panel">${settingsPanelHeader('☂','الإجازات والأرصدة','تعريف أنواع الإجازات ورصيد كل نوع ومعاملته المالية.')}<div class="card settings-section-card"><div class="card-title"><div><h3>أنواع الإجازات</h3><div class="small muted">الإجازات غير المدفوعة تُخصم تلقائيًا عند احتساب الراتب</div></div><span class="settings-count">${getLeaveTypes().length} أنواع</span></div><div class="leave-type-add settings-leave-add"><div class="field"><label>اسم النوع</label><input class="input" id="newLeaveType" placeholder="مثال: إجازة زواج"></div><div class="field"><label>المعاملة المالية</label><select class="select" id="newLeavePaid"><option value="true">مدفوعة</option><option value="false">بدون راتب</option></select></div><div class="field"><label>الرصيد السنوي بالأيام</label><input class="input" id="newLeaveAnnualDays" type="number" min="0" step="0.5" value="0"></div><button class="btn btn-primary" type="button" onclick="addLeaveType()">＋ إضافة النوع</button></div><div class="leave-type-list professional-list">${getLeaveTypes().map(leaveTypeCard).join('')}</div></div></div>`}
function renderSettingsDocuments(s){return `<div class="settings-panel">${settingsPanelHeader('📁','فئات المستندات والعقود','تحكم في الفئات التي تظهر عند إضافة مستند أو عقد للموظف.')}<div class="card settings-section-card"><div class="card-title"><div><h3>فئات المستندات</h3><div class="small muted">يمكن الإضافة والتعديل والحذف، وتظهر الفئات فورًا في نموذج المستندات.</div></div><span class="settings-count">${getDocumentCategories().length} فئات</span></div><div class="expense-category-add"><div class="field"><label>فئة جديدة</label><input class="input" id="newDocumentCategory" placeholder="مثال: رخصة مزاولة مهنة" onkeydown="if(event.key==='Enter'){event.preventDefault();addDocumentCategory()}"></div><button class="btn btn-primary" type="button" onclick="addDocumentCategory()">＋ إضافة الفئة</button></div><div class="expense-category-list professional-list">${getDocumentCategories().map(documentCategoryCard).join('')}</div></div></div>`}
function documentCategoryCard(name){const used=state.documents.filter(x=>x.category===name).length;return `<div class="expense-category-card"><div class="expense-category-icon">📄</div><div><strong>${escapeHTML(name)}</strong><small>${used} مستند مرتبط</small></div><div class="actions"><button class="btn btn-secondary btn-sm" onclick="renameDocumentCategory('${encodeURIComponent(name)}')">تعديل</button><button class="btn btn-danger btn-sm" onclick="deleteDocumentCategory('${encodeURIComponent(name)}')" ${used?'disabled':''}>حذف</button></div></div>`}
function addDocumentCategory(){const input=$('#newDocumentCategory'),name=String(input?.value||'').trim();if(!name)return toast('اكتب اسم الفئة','error');if(getDocumentCategories().some(x=>x.toLowerCase()===name.toLowerCase()))return toast('الفئة موجودة بالفعل','error');state.settings.documentCategories.push(name);logAudit('إضافة فئة مستند','الإعدادات',name);saveState();render();toast('تمت إضافة فئة المستند')}
function renameDocumentCategory(encoded){const old=decodeURIComponent(encoded),name=prompt('اسم الفئة الجديد',old)?.trim();if(!name||name===old)return;if(getDocumentCategories().some(x=>x!==old&&x.toLowerCase()===name.toLowerCase()))return toast('الفئة موجودة بالفعل','error');state.settings.documentCategories=state.settings.documentCategories.map(x=>x===old?name:x);state.documents.forEach(x=>{if(x.category===old)x.category=name});logAudit('تعديل فئة مستند','الإعدادات',`${old} ← ${name}`);saveState();render();toast('تم تعديل الفئة')}
function deleteDocumentCategory(encoded){const name=decodeURIComponent(encoded);if(state.documents.some(x=>x.category===name))return toast('لا يمكن حذف فئة مرتبطة بمستندات','error');if(!confirm(`حذف فئة ${name}؟`))return;state.settings.documentCategories=state.settings.documentCategories.filter(x=>x!==name);saveState();render();toast('تم حذف الفئة')}

function permissionRouteLabel(route){return NAV.find(n=>n[0]===route)?.[2]||EXTRA_MODULES[route]?.label||route}
function permissionRoleTemplates(){return [['employee','موظف'],['manager','مدير'],['admin','مسؤول النظام'],...getPermissionProfiles().map(p=>[p.id,p.name])].filter((x,i,a)=>a.findIndex(v=>v[0]===x[0])===i)}
function templatePermissions(role){
  if(role==='admin')return allPermissionRoutes();
  if(role==='manager')return normalizePermissionArray(NAV.filter(n=>n[3].includes('manager')).map(n=>n[0]).concat(Object.keys(EXTRA_MODULES||{})));
  if(role==='employee')return normalizePermissionArray(NAV.filter(n=>n[3].includes('employee')).map(n=>n[0]));
  return normalizePermissionArray(permissionProfile(role)?.permissions||[]);
}
function permissionCheckboxHTML(route,selected=[],scope='employeePermission'){
  const id=`${scope}_${route}`;
  return `<label class="permission-check"><input id="${escapeHTML(id)}" type="checkbox" class="permission-route-check" value="${escapeHTML(route)}" ${selected.includes(route)?'checked':''} onchange="updateEmployeePermissionCounter();updatePermissionGroupCheckCounter()"><span>${escapeHTML(permissionRouteLabel(route))}</span><small>${escapeHTML(route)}</small></label>`
}
function permissionGroupsHTML(selected=[],scope='employeePermission'){
  const selectedList=normalizePermissionArray(selected),used=new Set();
  const groups=[];
  if(typeof SERVICE_GROUPS!=='undefined'){
    SERVICE_GROUPS.forEach(g=>{
      const routes=g.items.map(x=>x[0]).filter(r=>allPermissionRoutes().includes(r));
      routes.forEach(r=>used.add(r));
      if(routes.length)groups.push(`<section class="permission-group-box"><div class="permission-group-title"><strong>${escapeHTML(g.title)}</strong><button class="link-btn" type="button" onclick="togglePermissionGroup(this,true)">تحديد المجموعة</button><button class="link-btn" type="button" onclick="togglePermissionGroup(this,false)">مسح</button></div><div class="permission-check-grid">${routes.map(r=>permissionCheckboxHTML(r,selectedList,scope)).join('')}</div></section>`);
    });
  }
  const rest=allPermissionRoutes().filter(r=>!used.has(r));
  if(rest.length)groups.unshift(`<section class="permission-group-box"><div class="permission-group-title"><strong>الصلاحيات الأساسية</strong><button class="link-btn" type="button" onclick="togglePermissionGroup(this,true)">تحديد المجموعة</button><button class="link-btn" type="button" onclick="togglePermissionGroup(this,false)">مسح</button></div><div class="permission-check-grid">${rest.map(r=>permissionCheckboxHTML(r,selectedList,scope)).join('')}</div></section>`);
  return groups.join('');
}
function selectedPermissionValues(root=document){return normalizePermissionArray($$('.permission-route-check:checked',root).map(x=>x.value))}
function renderSettingsPermissions(s){
  const assignedUsers=state.users.filter(u=>u.employeeId),routesCount=allPermissionRoutes().length;
  return `<div class="settings-panel">${settingsPanelHeader('🔐','الأدوار والصلاحيات','حدد صلاحيات كل موظف بالتفصيل، أو أنشئ دورًا محفوظًا ثم استخدمه كقالب سريع.')}
  <div class="card settings-section-card full-span employee-role-assignment">
    <div class="card-title"><div><h3>صلاحيات الموظف التفصيلية</h3><div class="small muted">كل صلاحيات البرنامج موجودة هنا. اختر الموظف ثم حدد الصفحات والخدمات التي يسمح له بالدخول إليها.</div></div><span class="settings-count">${routesCount} صلاحية</span></div>
    <div class="permission-assignment-grid enhanced">
      <div class="field"><label>الموظف</label><select class="select" id="permissionEmployeeSelect" onchange="syncPermissionEmployeeSelection()"><option value="">اختر الموظف</option>${state.employees.map(e=>{const u=employeeAccount(e.id);return `<option value="${e.id}">${escapeHTML(e.name)} — ${escapeHTML(e.branch)}${u?'':' (بدون حساب)'}</option>`}).join('')}</select></div>
      <div class="field"><label>قالب سريع / دور محفوظ</label><select class="select" id="permissionRoleSelect" onchange="applyEmployeePermissionTemplate()">${permissionRoleTemplates().map(([id,name])=>`<option value="${escapeHTML(id)}">${escapeHTML(name)}</option>`).join('')}</select><div class="help">اختيار الدور ينسخ صلاحياته، ويمكنك تعديل الاختيارات بعدها.</div></div>
      <div class="field"><label>حالة حساب الدخول</label><select class="select" id="permissionAccountActive"><option value="true">مفعّل</option><option value="false">موقوف</option></select></div>
      <button class="btn btn-primary permission-assign-btn" type="button" onclick="assignEmployeePermission()">✓ حفظ صلاحيات الموظف</button>
    </div>
    <div id="permissionEmployeeSummary" class="permission-employee-summary">اختر موظفًا لعرض حسابه وصلاحيته الحالية.</div>
    <div class="permission-toolbar"><button class="btn btn-secondary btn-sm" type="button" onclick="setAllEmployeePermissionChecks(true)">تحديد كل الصلاحيات</button><button class="btn btn-secondary btn-sm" type="button" onclick="setAllEmployeePermissionChecks(false)">مسح التحديد</button><button class="btn btn-secondary btn-sm" type="button" onclick="restoreSelectedEmployeePermissions()">استرجاع صلاحيات الموظف الحالية</button><span class="small muted" id="employeePermissionCounter">0 صلاحية محددة</span></div>
    <div id="employeePermissionChecks" class="employee-permission-groups">${permissionGroupsHTML([], 'employeePermission')}</div>
    ${renderEmployeeRoleDirectory()}
  </div>
  <div class="card settings-section-card full-span"><div class="card-title"><div><h3>إنشاء دور وظيفي محفوظ</h3><div class="small muted">لا يسمح بتكرار اسم الدور، واستخدمه كقالب سريع لأي موظف.</div></div></div><div class="org-add"><input class="input" id="newPermissionProfile" placeholder="اسم الدور الجديد"><button class="btn btn-primary" type="button" onclick="addPermissionProfile()">＋ إضافة دور</button></div></div>
  <div class="permission-profile-grid">${getPermissionProfiles().map(permissionProfileCard).join('')}</div>
  <div class="notice settings-notice">مسؤول النظام يمتلك كل الصلاحيات دائمًا. يتم منع تكرار أسماء الأدوار، وأكواد الصلاحيات، وحسابات الموظفين.</div></div>`
}
function permissionProfileCard(profile){
  const assigned=state.users.filter(u=>u.role===profile.id),selected=normalizePermissionArray(profile.permissions||[]);
  return `<div class="card settings-section-card permission-profile-card"><div class="card-title"><div><h3>${escapeHTML(profile.name)}</h3><div class="small muted">${selected.length} صلاحيات مفعلة · ${assigned.length} موظف</div></div><div class="actions"><button class="btn btn-secondary btn-sm" onclick="prepareRoleAssignment('${profile.id}')">تعيين لموظف</button><button class="btn btn-secondary btn-sm" onclick="renamePermissionProfile('${profile.id}')">تعديل الاسم</button>${!['hr','finance'].includes(profile.id)?`<button class="btn btn-danger btn-sm" onclick="deletePermissionProfile('${profile.id}')">حذف</button>`:''}</div></div>${assigned.length?`<div class="assigned-user-chips">${assigned.slice(0,8).map(u=>`<span>${escapeHTML(emp(u.employeeId)?.name||u.name)}</span>`).join('')}${assigned.length>8?`<b>+${assigned.length-8}</b>`:''}</div>`:''}<div class="permission-toolbar mini"><button class="link-btn" type="button" onclick="setProfilePermissions('${profile.id}','all')">تحديد الكل</button><button class="link-btn" type="button" onclick="setProfilePermissions('${profile.id}','none')">مسح</button></div><div class="employee-permission-groups compact">${permissionGroupsHTML(selected, `profile_${profile.id}`)}</div><div class="actions permission-save-row"><button class="btn btn-primary btn-sm" onclick="saveProfilePermissionsFromCard('${profile.id}',this)">حفظ صلاحيات الدور</button></div></div>`
}
function addPermissionProfile(){
  const name=String($('#newPermissionProfile')?.value||'').trim();
  if(!name)return toast('اكتب اسم الدور','error');
  if(permissionRoleTemplates().some(([id,label])=>String(label).trim().toLowerCase()===name.toLowerCase()))return toast('اسم الدور موجود بالفعل','error');
  let base=name.replace(/\s+/g,'_').replace(/[^\w\u0600-\u06FF_-]/g,'').slice(0,24)||'role',id=`role_${base}`;
  while(['admin','manager','employee'].includes(id)||getPermissionProfiles().some(p=>p.id===id))id=`role_${Date.now().toString(36)}`;
  state.settings.permissionProfiles.push({id,name,permissions:['dashboard']});saveState();render();toast('تمت إضافة الدور')
}
function renamePermissionProfile(id){const p=permissionProfile(id),name=prompt('اسم الدور',p?.name||'')?.trim();if(!p||!name)return;if(permissionRoleTemplates().some(([rid,label])=>rid!==id&&String(label).trim().toLowerCase()===name.toLowerCase()))return toast('يوجد دور آخر بنفس الاسم','error');p.name=name;saveState();render();toast('تم تعديل اسم الدور')}
function deletePermissionProfile(id){if(['hr','finance'].includes(id))return toast('لا يمكن حذف الأدوار الأساسية','error');if(state.users.some(u=>u.role===id))return toast('لا يمكن حذف دور مستخدم في حسابات الموظفين','error');if(!confirm('حذف الدور؟'))return;state.settings.permissionProfiles=state.settings.permissionProfiles.filter(x=>x.id!==id);saveState();render();toast('تم حذف الدور')}
function toggleProfilePermission(id,route,checked){const p=permissionProfile(id);if(!p)return;p.permissions=normalizePermissionArray(checked?[...(p.permissions||[]),route]:(p.permissions||[]).filter(x=>x!==route));saveState();toast('تم تحديث الصلاحيات')}
function saveProfilePermissionsFromCard(id,btn){const p=permissionProfile(id);if(!p)return;const card=btn.closest('.permission-profile-card');p.permissions=selectedPermissionValues(card);if(!p.permissions.length)return toast('اختر صلاحية واحدة على الأقل للدور','error');saveState();render();toast('تم حفظ صلاحيات الدور')}
function setProfilePermissions(id,mode){const p=permissionProfile(id);if(!p)return;const card=[...$$('.permission-profile-card')].find(c=>c.querySelector(`[onclick*="${id}"]`));if(!card)return;$$('.permission-route-check',card).forEach(ch=>ch.checked=mode==='all');}
function togglePermissionGroup(btn,checked){const box=btn.closest('.permission-group-box');if(!box)return;$$('.permission-route-check',box).forEach(ch=>ch.checked=checked);updateEmployeePermissionCounter();updatePermissionGroupCheckCounter()}
function setAllEmployeePermissionChecks(checked){$$('#employeePermissionChecks .permission-route-check').forEach(ch=>ch.checked=checked);updateEmployeePermissionCounter()}
function updateEmployeePermissionCounter(){const c=$('#employeePermissionCounter');if(c)c.textContent=`${selectedPermissionValues($('#employeePermissionChecks')||document).length} صلاحية محددة`}
function applyEmployeePermissionTemplate(){const role=$('#permissionRoleSelect')?.value||'employee',selected=templatePermissions(role);$$('#employeePermissionChecks .permission-route-check').forEach(ch=>ch.checked=selected.includes(ch.value));updateEmployeePermissionCounter()}
function restoreSelectedEmployeePermissions(){syncPermissionEmployeeSelection(true)}
function renderEmployeeRoleDirectory(){const rows=state.employees.map(e=>{const u=employeeAccount(e.id);return `<tr data-search="${escapeHTML((e.name+' '+e.code+' '+e.branch+' '+e.department+' '+(u?accountPermissionLabel(u):'بدون حساب')).toLowerCase())}"><td><div class="employee-cell">${avatarHTML(e,34)}<div><strong>${escapeHTML(e.name)}</strong><div class="small muted">${escapeHTML(e.code)} · ${escapeHTML(e.department)}</div></div></div></td><td>${escapeHTML(e.branch)}</td><td>${u?escapeHTML(accountPermissionLabel(u)):'<span class="badge badge-neutral">بدون حساب</span>'}</td><td>${u?`<span class="badge ${u.active?'badge-success':'badge-neutral'}">${u.active?'مفعّل':'موقوف'}</span>`:'-'}</td><td><button class="btn btn-secondary btn-sm" type="button" onclick="selectEmployeeForPermission('${e.id}')">اختيار</button></td></tr>`}).join('');return `<div class="employee-role-directory"><div class="employee-role-directory-head"><div><strong>الموظفون والصلاحيات الحالية</strong><div class="small muted">اختيار سريع للموظف وتعديل صلاحياته من نفس الصفحة</div></div><input class="input" id="roleDirectorySearch" placeholder="بحث باسم الموظف أو الفرع أو الدور" oninput="filterRoleDirectory(this.value)"></div><div class="table-wrap"><table class="table compact-table"><thead><tr><th>الموظف</th><th>الفرع</th><th>الصلاحية الحالية</th><th>الحساب</th><th>إجراء</th></tr></thead><tbody id="employeeRoleDirectoryRows">${rows}</tbody></table></div></div>`}
function selectEmployeeForPermission(employeeId){const select=$('#permissionEmployeeSelect');if(!select)return;select.value=employeeId;syncPermissionEmployeeSelection();select.scrollIntoView({behavior:'smooth',block:'center'})}
function prepareRoleAssignment(roleId){const role=$('#permissionRoleSelect');if(role)role.value=roleId;applyEmployeePermissionTemplate();$('#permissionEmployeeSelect')?.scrollIntoView({behavior:'smooth',block:'center'});toast('اختر الموظف ثم احفظ الصلاحية')}
function syncPermissionEmployeeSelection(force=false){const employeeId=$('#permissionEmployeeSelect')?.value,e=emp(employeeId),u=employeeAccount(employeeId),role=$('#permissionRoleSelect'),active=$('#permissionAccountActive'),summary=$('#permissionEmployeeSummary');if(!summary)return;if(!e){summary.innerHTML='اختر موظفًا لعرض حسابه وصلاحيته الحالية.';setAllEmployeePermissionChecks(false);return}if(!u){if(role)role.value='employee';if(active)active.value='false';setAllEmployeePermissionChecks(false);summary.innerHTML=`<span class="badge badge-warning">بدون حساب دخول</span><strong>${escapeHTML(e.name)}</strong><span>أنشئ حسابًا للموظف من صفحة الموظفين أولًا حتى يمكن إسناد الصلاحيات.</span>`;return}if(role)role.value=u.role||'employee';if(active)active.value=String(u.active!==false);const selected=userHasCustomPermissions(u)?normalizePermissionArray(u.permissions):templatePermissions(u.role||'employee');$$('#employeePermissionChecks .permission-route-check').forEach(ch=>ch.checked=selected.includes(ch.value));updateEmployeePermissionCounter();summary.innerHTML=`${avatarHTML(e,34)}<div><strong>${escapeHTML(e.name)}</strong><div class="small muted">${escapeHTML(e.code)} · ${escapeHTML(e.branch)} · ${escapeHTML(e.department)}</div></div><span class="badge badge-info">${escapeHTML(accountPermissionLabel(u))}</span><span class="badge ${u.active?'badge-success':'badge-neutral'}">${u.active?'الحساب مفعّل':'الحساب موقوف'}</span>`}
function assignEmployeePermission(){
  const employeeId=$('#permissionEmployeeSelect')?.value,role=$('#permissionRoleSelect')?.value||'employee',active=$('#permissionAccountActive')?.value==='true',e=emp(employeeId),u=employeeAccount(employeeId);
  if(!e)return toast('اختر الموظف أولًا','error');
  if(!u)return toast('هذا الموظف ليس لديه حساب دخول. أنشئ الحساب من صفحة الموظفين أولًا.','error');
  if(state.users.some(x=>x.id!==u.id&&x.employeeId===employeeId))return toast('يوجد حساب آخر لنفس الموظف، راجع حسابات الموظفين أولًا','error');
  if(state.users.some(x=>x.id!==u.id&&String(x.email||'').toLowerCase()===String(u.email||'').toLowerCase()))return toast('بريد تسجيل الدخول مكرر بين المستخدمين','error');
  const permissions=selectedPermissionValues($('#employeePermissionChecks')||document);
  if(!permissions.length)return toast('حدد صلاحية واحدة على الأقل للموظف','error');
  if(u.id===currentUser?.id&&(role!=='admin'||!active||!permissions.includes('settings')))return toast('لا يمكن إلغاء صلاحية مسؤول النظام الحالي أو إيقاف حسابه أثناء تسجيل الدخول','error');
  if(role==='admin'&&!confirm(`منح ${e.name} صلاحية مسؤول النظام الكاملة؟`))return;
  u.role=role;u.permissions=normalizePermissionArray(permissions);u.active=active;u.name=e.name;
  logAudit('إسناد صلاحيات تفصيلية','الإعدادات',`${e.name} ← ${roleLabel(role)} / ${u.permissions.length} صلاحية / ${active?'مفعّل':'موقوف'}`);
  const signedInAccount=state.users.find(x=>x.id===currentUser?.id);if(signedInAccount)saveSession({...signedInAccount});
  saveState();render();toast('تم حفظ صلاحيات الموظف بنجاح')
}
function filterRoleDirectory(query){const q=String(query||'').trim().toLowerCase();$$('#employeeRoleDirectoryRows tr').forEach(row=>row.style.display=!q||String(row.dataset.search||'').includes(q)?'':'none')}


/* ===== v3.8.2: Group-first roles and permissions screen ===== */
function ensurePermissionActiveGroup(){
  const profiles=getPermissionProfiles();
  if(!profiles.length){
    state.settings.permissionProfiles=DEFAULT_PERMISSION_PROFILES.map(x=>({...x,permissions:[...x.permissions]}));
  }
  if(!permissionActiveGroupId||!permissionProfile(permissionActiveGroupId))permissionActiveGroupId=getPermissionProfiles()[0]?.id||'';
  return permissionProfile(permissionActiveGroupId)||getPermissionProfiles()[0];
}
function permissionGroupSummaryCard(profile){
  const assigned=state.users.filter(u=>u.role===profile.id).length;
  const selected=permissionActiveGroupId===profile.id;
  const count=normalizePermissionArray(profile.permissions||[]).length;
  return `<button class="permission-group-summary compact ${selected?'active':''}" type="button" onclick="selectPermissionGroup('${escapeHTML(profile.id)}')">
    <span class="permission-group-main"><strong>${escapeHTML(profile.name)}</strong><small>${count} صلاحية · ${assigned} موظف</small></span>
    <b>←</b>
  </button>`;
}
function permissionGroupEmployeeList(profileId){
  const rows=state.employees.map(e=>{
    const u=employeeAccount(e.id),checked=u?.role===profileId,current=u?accountPermissionLabel(u):'بدون حساب',protectedSelf=u?.id===currentUser?.id&&currentUser?.role==='admin';
    const disabled=!u||protectedSelf;
    const badge=!u?'بدون حساب':protectedSelf?'محمي':checked?'داخل المجموعة':current;
    return `<label class="permission-employee-assign compact ${disabled?'disabled':''}" data-search="${escapeHTML((e.name+' '+e.code+' '+e.branch+' '+e.department+' '+current).toLowerCase())}">
      <input type="checkbox" class="permission-employee-group-check" value="${escapeHTML(e.id)}" ${checked?'checked':''} ${disabled?'disabled':''} onchange="updatePermissionGroupAssignCounter()">
      <span class="employee-assign-copy"><strong>${escapeHTML(e.name)}</strong><small>${escapeHTML(e.code)} · ${escapeHTML(e.branch)} · ${escapeHTML(e.department)}</small></span>
      <em class="assign-mini-badge ${checked?'selected':''}">${escapeHTML(badge)}</em>
    </label>`;
  }).join('');
  return `<div class="permission-employee-search-row compact"><input class="input" id="permissionEmployeeGroupSearch" placeholder="بحث في الموظفين" oninput="filterPermissionGroupEmployees(this.value)"><span class="settings-count" id="permissionGroupAssignCounter">0 موظف</span></div><div class="permission-employee-assign-list compact" id="permissionGroupEmployees">${rows}</div>`;
}
function permissionGroupsCompactHTML(selected=[],scope='permissionGroupCompact'){
  const selectedList=normalizePermissionArray(selected),used=new Set();
  const blocks=[];
  const buildBlock=(title,routes,open=false)=>{
    routes.forEach(r=>used.add(r));
    const chosen=routes.filter(r=>selectedList.includes(r)).length;
    return `<details class="permission-mini-group" ${open?'open':''}>
      <summary><span>${escapeHTML(title)}</span><small>${chosen}/${routes.length}</small></summary>
      <div class="permission-mini-actions"><button class="link-btn" type="button" onclick="togglePermissionGroup(this,true)">تحديد المجموعة</button><button class="link-btn" type="button" onclick="togglePermissionGroup(this,false)">مسح</button></div>
      <div class="permission-mini-check-grid">${routes.map(r=>permissionCheckboxHTML(r,selectedList,scope)).join('')}</div>
    </details>`;
  };
  const rest=[];
  if(typeof SERVICE_GROUPS!=='undefined'){
    SERVICE_GROUPS.forEach((g,i)=>{
      const routes=g.items.map(x=>x[0]).filter(r=>allPermissionRoutes().includes(r));
      if(routes.length)blocks.push(buildBlock(g.title,routes,i===0));
    });
  }
  allPermissionRoutes().forEach(r=>{if(!used.has(r))rest.push(r)});
  if(rest.length)blocks.unshift(buildBlock('الصلاحيات الأساسية',rest,true));
  return blocks.join('');
}
function renderSettingsPermissions(s){
  const profile=ensurePermissionActiveGroup(),profiles=getPermissionProfiles(),routesCount=allPermissionRoutes().length,assigned=state.users.filter(u=>u.role===profile.id).length,selectedCount=normalizePermissionArray(profile.permissions||[]).length;
  return `<div class="settings-panel compact-permissions-panel">${settingsPanelHeader('🔐','الأدوار والصلاحيات','إدارة مختصرة للمجموعات: اختر المجموعة، حدد صلاحياتها، ثم عيّن الموظفين لها من نفس الشاشة.')}
  <div class="permission-compact-layout">
    <aside class="card permission-compact-side">
      <div class="permission-compact-side-head"><div><h3>المجموعات</h3><small>${profiles.length} مجموعة محفوظة</small></div><button class="btn btn-primary btn-sm" type="button" onclick="openPermissionGroupCreateModal()">＋ إضافة</button></div>
      <div class="permission-groups-list compact">${profiles.map(permissionGroupSummaryCard).join('')}</div>
    </aside>
    <section class="card permission-compact-editor" data-profile-id="${escapeHTML(profile.id)}">
      <div class="permission-compact-editor-head"><div><h3>${escapeHTML(profile.name)}</h3><small>${selectedCount} صلاحية محددة · ${assigned} موظف معيّن</small></div><div class="actions"><button class="btn btn-primary btn-sm" type="button" onclick="savePermissionGroupEditor('${profile.id}')">حفظ</button>${!['hr','finance'].includes(profile.id)?`<button class="btn btn-danger btn-sm" type="button" onclick="deletePermissionProfile('${profile.id}')">حذف</button>`:''}</div></div>
      <div class="permission-compact-form-row">
        <div class="field"><label>اسم المجموعة</label><input class="input" id="permissionGroupName" value="${escapeHTML(profile.name)}" placeholder="مثال: مسؤولو الموارد البشرية"></div>
        <div class="permission-group-mini-stats compact"><span><small>المتاح</small><strong>${routesCount}</strong></span><span><small>المحدد</small><strong id="permissionGroupCheckCounter">${selectedCount}</strong></span><span><small>الموظفون</small><strong>${assigned}</strong></span></div>
      </div>
      <div class="permission-toolbar compact"><button class="btn btn-secondary btn-sm" type="button" onclick="setPermissionGroupChecks(true)">تحديد كل الصلاحيات</button><button class="btn btn-secondary btn-sm" type="button" onclick="setPermissionGroupChecks(false)">مسح الصلاحيات</button></div>
      <div id="permissionGroupPermissionChecks" class="employee-permission-groups compact permission-compact-checks">${permissionGroupsCompactHTML(profile.permissions||[], `group_${profile.id}`)}</div>
      <div class="permission-compact-assignment">
        <div class="compact-subhead"><div><strong>تعيين الموظفين للمجموعة</strong><small>الموظف يكون تابع لمجموعة واحدة فقط، وأي تعيين جديد ينقله لهذه المجموعة.</small></div><div class="actions"><button class="btn btn-secondary btn-sm" type="button" onclick="setPermissionGroupEmployees(true)">تحديد كل الموظفين</button><button class="btn btn-secondary btn-sm" type="button" onclick="setPermissionGroupEmployees(false)">مسح التعيين</button></div></div>
        ${permissionGroupEmployeeList(profile.id)}
      </div>
      <div class="permission-compact-save"><button class="btn btn-primary" type="button" onclick="savePermissionGroupEditor('${profile.id}')">✓ حفظ المجموعة</button></div>
    </section>
  </div>
  <div class="notice settings-notice compact">التحقق مفعل: لا تكرار في اسم المجموعة، لا حفظ بدون صلاحيات، ولا ربط للموظف بأكثر من مجموعة.</div>
  </div>`;
}
function permissionEmployeeGroupRows(){return state.employees.map(e=>{const u=employeeAccount(e.id),label=u?accountPermissionLabel(u):'بدون حساب',profileId=u?.role||'',profile=permissionProfile(profileId),editable=profile?profile.id:'';return `<tr data-search="${escapeHTML((e.name+' '+e.code+' '+e.branch+' '+e.department+' '+label).toLowerCase())}"><td><div class="employee-cell">${avatarHTML(e,34)}<div><strong>${escapeHTML(e.name)}</strong><div class="small muted">${escapeHTML(e.code)} · ${escapeHTML(e.department)}</div></div></div></td><td>${escapeHTML(e.branch)}</td><td>${u?`<span class="badge ${profile?'badge-info':'badge-neutral'}">${escapeHTML(label)}</span>`:'<span class="badge badge-warning">بدون حساب</span>'}</td><td>${u?`<span class="badge ${u.active?'badge-success':'badge-neutral'}">${u.active?'مفعّل':'موقوف'}</span>`:'-'}</td><td>${editable?`<button class="btn btn-secondary btn-sm" onclick="selectPermissionGroup('${editable}')">فتح المجموعة</button>`:'-'}</td></tr>`}).join('')}
function selectPermissionGroup(id){if(!permissionProfile(id))return;permissionActiveGroupId=id;render()}
function setPermissionGroupChecks(checked){$$('#permissionGroupPermissionChecks .permission-route-check').forEach(ch=>ch.checked=checked);updatePermissionGroupCheckCounter()}
function updatePermissionGroupCheckCounter(){const c=$('#permissionGroupCheckCounter');if(c)c.textContent=`${selectedPermissionValues($('#permissionGroupPermissionChecks')||document).length} صلاحية محددة`}
function setPermissionGroupEmployees(checked){$$('#permissionGroupEmployees .permission-employee-group-check:not(:disabled)').forEach(ch=>ch.checked=checked);updatePermissionGroupAssignCounter()}
function updatePermissionGroupAssignCounter(){const c=$('#permissionGroupAssignCounter');if(c)c.textContent=`${$$('#permissionGroupEmployees .permission-employee-group-check:checked').length} موظف`}
function filterPermissionGroupEmployees(query){const q=String(query||'').trim().toLowerCase();$$('#permissionGroupEmployees .permission-employee-assign').forEach(row=>row.style.display=!q||String(row.dataset.search||'').includes(q)?'':'none')}
function openPermissionGroupCreateModal(){
  openModal('إضافة مجموعة صلاحيات',`<div class="field"><label>اسم المجموعة</label><input class="input" id="createPermissionGroupName" placeholder="مثال: الحسابات والرواتب" required></div><div class="permission-toolbar"><button class="btn btn-secondary btn-sm" type="button" onclick="setCreatePermissionGroupChecks(true)">تحديد الكل</button><button class="btn btn-secondary btn-sm" type="button" onclick="setCreatePermissionGroupChecks(false)">مسح</button></div><div id="createPermissionGroupChecks" class="employee-permission-groups compact">${permissionGroupsHTML(['dashboard'], 'createPermissionGroup')}</div>`,()=>createPermissionGroupFromModal())
}
function setCreatePermissionGroupChecks(checked){$$('#createPermissionGroupChecks .permission-route-check').forEach(x=>x.checked=checked)}
function createPermissionGroupFromModal(){
  const name=String($('#createPermissionGroupName')?.value||'').trim();
  if(!name)return toast('اكتب اسم المجموعة','error');
  if(permissionRoleTemplates().some(([id,label])=>String(label).trim().toLowerCase()===name.toLowerCase()))return toast('اسم المجموعة موجود بالفعل','error');
  const permissions=selectedPermissionValues($('#createPermissionGroupChecks')||document);
  if(!permissions.length)return toast('حدد صلاحية واحدة على الأقل','error');
  let base=name.replace(/\s+/g,'_').replace(/[^\w\u0600-\u06FF_-]/g,'').slice(0,24)||'group',id=`group_${base}`;
  while(['admin','manager','employee'].includes(id)||getPermissionProfiles().some(p=>p.id===id))id=`group_${Date.now().toString(36)}`;
  state.settings.permissionProfiles.push({id,name,permissions});permissionActiveGroupId=id;logAudit('إضافة مجموعة صلاحيات','الإعدادات',`${name} / ${permissions.length} صلاحية`);saveState();closeModal();render();toast('تمت إضافة مجموعة الصلاحيات')
}
function savePermissionGroupEditor(id){
  const p=permissionProfile(id);if(!p)return toast('المجموعة غير موجودة','error');
  const name=String($('#permissionGroupName')?.value||'').trim();
  if(!name)return toast('اكتب اسم المجموعة','error');
  if(permissionRoleTemplates().some(([rid,label])=>rid!==id&&String(label).trim().toLowerCase()===name.toLowerCase()))return toast('اسم المجموعة موجود بالفعل','error');
  const permissions=selectedPermissionValues($('#permissionGroupPermissionChecks')||document);
  if(!permissions.length)return toast('حدد صلاحية واحدة على الأقل للمجموعة','error');
  const selectedEmployees=$$('#permissionGroupEmployees .permission-employee-group-check:checked').map(x=>x.value);
  p.name=name;p.permissions=permissions;
  let assigned=0,removed=0,skipped=0;
  state.users.forEach(u=>{
    if(!u.employeeId)return;
    const isSelected=selectedEmployees.includes(u.employeeId);
    const protectedSelf=u.id===currentUser?.id&&currentUser?.role==='admin';
    if(protectedSelf&&isSelected){skipped++;return}
    if(isSelected){if(u.role!==id)assigned++;u.role=id;delete u.permissions;u.name=emp(u.employeeId)?.name||u.name}
    else if(u.role===id){u.role='employee';delete u.permissions;removed++}
  });
  logAudit('تعديل مجموعة صلاحيات','الإعدادات',`${name} / ${permissions.length} صلاحية / ${assigned} تعيين / ${removed} إزالة`);
  const signedInAccount=state.users.find(x=>x.id===currentUser?.id);if(signedInAccount)saveSession({...signedInAccount});
  saveState();render();toast(`تم حفظ المجموعة${skipped?`، وتم تجاهل حسابك الحالي للحماية`:''}`)
}


function renderSettingsSystem(s){return `<div class="settings-panel">${settingsPanelHeader('🛡','النظام والنسخ الاحتياطي','إدارة النسخ الاحتياطية، سجل النظام، وحالة جاهزية التشغيل.')}<div class="settings-section-grid"><div class="card settings-section-card"><div class="card-title"><div><h3>النسخ الاحتياطي والاسترجاع</h3><div class="small muted">نسخة JSON كاملة تشمل البيانات والمرفقات والإعدادات</div></div></div><div class="backup-actions settings-backup-actions"><button class="btn btn-primary" type="button" onclick="downloadBackup()">⇩ تحميل نسخة احتياطية</button><label class="btn btn-secondary">↥ استرجاع نسخة<input type="file" accept="application/json,.json" hidden onchange="restoreBackupFile(this)"></label><button class="btn btn-secondary" type="button" onclick="go('audit')">🛡 فتح سجل النظام</button></div><div class="notice settings-notice">احفظ نسخة احتياطية قبل أي تعديل كبير. الاسترجاع يستبدل البيانات الحالية بالكامل.</div></div><div class="card settings-section-card"><div class="card-title"><div><h3>جاهزية النسخة الإنتاجية</h3><div class="small muted">حالة مكونات النظام الحالية</div></div></div><div class="status-panel professional-status"><div class="status-row"><span>واجهة عربية / English</span><span class="badge badge-success">جاهز</span></div><div class="status-row"><span>تخزين محلي Offline</span><span class="badge badge-success">جاهز</span></div><div class="status-row"><span>تقارير وCSV</span><span class="badge badge-success">جاهز</span></div><div class="status-row"><span>خادم وقاعدة بيانات مركزية</span><span class="badge badge-warning">يحتاج ربط</span></div><div class="status-row"><span>تعرّف بيومتري حقيقي</span><span class="badge badge-warning">يحتاج خدمة آمنة</span></div><div class="status-row"><span>ربط أجهزة البصمة</span><span class="badge badge-warning">يحتاج API الجهاز</span></div></div></div></div></div>`}

function expenseCategoryCard(name){const encoded=encodeURIComponent(name).replace(/'/g,'%27'),count=state.expenses.filter(x=>x.category===name).length;return `<div class="expense-category-card"><div><strong>${escapeHTML(name)}</strong><div class="small muted">${count} مصروف مرتبط</div></div><div class="actions"><button class="btn btn-secondary btn-sm" type="button" onclick="editExpenseCategory('${encoded}')">تعديل</button><button class="btn btn-danger btn-sm" type="button" onclick="removeExpenseCategory('${encoded}')">حذف</button></div></div>`}
function addExpenseCategory(){const input=$('#newExpenseCategory'),name=String(input?.value||'').trim();if(!name)return toast('اكتب اسم فئة المصروف','error');if(getExpenseCategories().some(v=>v.toLowerCase()===name.toLowerCase()))return toast('فئة المصروف موجودة بالفعل','error');state.settings.expenseCategories=[...getExpenseCategories(),name];saveState();render();toast('تمت إضافة فئة المصروف')}
function editExpenseCategory(encoded){const oldName=decodeURIComponent(encoded);openModal('تعديل فئة المصروف',`<div class="field"><label>اسم الفئة</label><input class="input" id="editExpenseCategoryName" value="${escapeHTML(oldName)}" required></div>`,()=>{const name=String($('#editExpenseCategoryName')?.value||'').trim();if(!name)return toast('اكتب اسم الفئة','error');if(getExpenseCategories().some(v=>v!==oldName&&v.toLowerCase()===name.toLowerCase()))return toast('يوجد فئة أخرى بنفس الاسم','error');state.settings.expenseCategories=getExpenseCategories().map(v=>v===oldName?name:v);state.expenses.filter(x=>x.category===oldName).forEach(x=>x.category=name);saveState();closeModal();render();toast('تم تحديث فئة المصروف')})}
function removeExpenseCategory(encoded){const name=decodeURIComponent(encoded);if(getExpenseCategories().length<=1)return toast('يجب الإبقاء على فئة مصروف واحدة على الأقل','error');if(state.expenses.some(x=>x.category===name))return toast('لا يمكن حذف الفئة لأنها مستخدمة في مصروفات مسجلة؛ عدّلها بدلًا من الحذف','error');if(!confirm(`حذف فئة المصروف «${name}»؟`))return;state.settings.expenseCategories=getExpenseCategories().filter(v=>v!==name);saveState();render();toast('تم حذف فئة المصروف')}

function deductionTypeCard(name){const encoded=encodeURIComponent(name).replace(/'/g,'%27'),count=state.adjustments.filter(x=>x.kind==='deduction'&&x.deductionType===name).length;return `<div class="expense-category-card"><div><strong>${escapeHTML(name)}</strong><div class="small muted">${count} خصم مرتبط</div></div><div class="actions"><button class="btn btn-secondary btn-sm" type="button" onclick="editDeductionType('${encoded}')">تعديل</button><button class="btn btn-danger btn-sm" type="button" onclick="removeDeductionType('${encoded}')">حذف</button></div></div>`}
function addDeductionType(){const input=$('#newDeductionType'),name=String(input?.value||'').trim();if(!name)return toast('اكتب اسم نوع الخصم','error');if(getDeductionTypes().some(v=>v.toLowerCase()===name.toLowerCase()))return toast('نوع الخصم موجود بالفعل','error');state.settings.deductionTypes=[...getDeductionTypes(),name];saveState();render();toast('تمت إضافة نوع الخصم')}
function editDeductionType(encoded){const oldName=decodeURIComponent(encoded);openModal('تعديل نوع الخصم',`<div class="field"><label>اسم النوع</label><input class="input" id="editDeductionTypeName" value="${escapeHTML(oldName)}" required></div>`,()=>{const name=String($('#editDeductionTypeName')?.value||'').trim();if(!name)return toast('اكتب اسم النوع','error');if(getDeductionTypes().some(v=>v!==oldName&&v.toLowerCase()===name.toLowerCase()))return toast('يوجد نوع آخر بنفس الاسم','error');state.settings.deductionTypes=getDeductionTypes().map(v=>v===oldName?name:v);state.adjustments.filter(x=>x.kind==='deduction'&&x.deductionType===oldName).forEach(x=>x.deductionType=name);saveState();closeModal();render();toast('تم تحديث نوع الخصم')})}
function removeDeductionType(encoded){const name=decodeURIComponent(encoded);if(getDeductionTypes().length<=1)return toast('يجب الإبقاء على نوع خصم واحد على الأقل','error');if(state.adjustments.some(x=>x.kind==='deduction'&&x.deductionType===name))return toast('لا يمكن حذف النوع لأنه مستخدم في خصومات مسجلة؛ عدّله بدلًا من الحذف','error');if(!confirm(`حذف نوع الخصم «${name}»؟`))return;state.settings.deductionTypes=getDeductionTypes().filter(v=>v!==name);saveState();render();toast('تم حذف نوع الخصم')}

function rewardTypeCard(name){const encoded=encodeURIComponent(name).replace(/'/g,'%27'),count=state.adjustments.filter(x=>x.kind==='reward'&&x.rewardType===name).length;return `<div class="expense-category-card"><div><strong>${escapeHTML(name)}</strong><div class="small muted">${count} مكافأة مرتبطة</div></div><div class="actions"><button class="btn btn-secondary btn-sm" type="button" onclick="editRewardType('${encoded}')">تعديل</button><button class="btn btn-danger btn-sm" type="button" onclick="removeRewardType('${encoded}')">حذف</button></div></div>`}
function addRewardType(){const input=$('#newRewardType'),name=String(input?.value||'').trim();if(!name)return toast('اكتب اسم نوع المكافأة','error');if(getRewardTypes().some(v=>v.toLowerCase()===name.toLowerCase()))return toast('نوع المكافأة موجود بالفعل','error');state.settings.rewardTypes=[...getRewardTypes(),name];saveState();render();toast('تمت إضافة نوع المكافأة')}
function editRewardType(encoded){const oldName=decodeURIComponent(encoded);openModal('تعديل نوع المكافأة',`<div class="field"><label>اسم النوع</label><input class="input" id="editRewardTypeName" value="${escapeHTML(oldName)}" required></div>`,()=>{const name=String($('#editRewardTypeName')?.value||'').trim();if(!name)return toast('اكتب اسم النوع','error');if(getRewardTypes().some(v=>v!==oldName&&v.toLowerCase()===name.toLowerCase()))return toast('يوجد نوع آخر بنفس الاسم','error');state.settings.rewardTypes=getRewardTypes().map(v=>v===oldName?name:v);state.adjustments.filter(x=>x.kind==='reward'&&x.rewardType===oldName).forEach(x=>x.rewardType=name);saveState();closeModal();render();toast('تم تحديث نوع المكافأة')})}
function removeRewardType(encoded){const name=decodeURIComponent(encoded);if(getRewardTypes().length<=1)return toast('يجب الإبقاء على نوع مكافأة واحد على الأقل','error');if(state.adjustments.some(x=>x.kind==='reward'&&x.rewardType===name))return toast('لا يمكن حذف النوع لأنه مستخدم في مكافآت مسجلة؛ عدّله بدلًا من الحذف','error');if(!confirm(`حذف نوع المكافأة «${name}»؟`))return;state.settings.rewardTypes=getRewardTypes().filter(v=>v!==name);saveState();render();toast('تم حذف نوع المكافأة')}


function leaveTypeCard(t){return `<div class="leave-type-card"><div><strong>${escapeHTML(t.name)}</strong><div class="small muted">${t.paid?'مدفوعة الأجر':'بدون راتب'} · رصيد سنوي ${Number(t.annualDays||0)} يوم</div></div><span class="badge badge-${t.paid?'success':'danger'}">${t.paid?'مدفوعة':'غير مدفوعة'}</span><div class="actions"><button class="btn btn-secondary btn-sm" type="button" onclick="editLeaveType('${t.id}')">تعديل</button><button class="btn btn-danger btn-sm" type="button" onclick="removeLeaveType('${t.id}')">حذف</button></div></div>`}
function addLeaveType(){const name=$('#newLeaveType')?.value.trim(),paid=$('#newLeavePaid')?.value==='true',annualDays=Math.max(0,Number($('#newLeaveAnnualDays')?.value||0));if(!name)return toast('اكتب اسم نوع الإجازة','error');if(getLeaveTypes().some(t=>t.name.toLowerCase()===name.toLowerCase()))return toast('نوع الإجازة موجود بالفعل','error');state.settings.leaveTypes.push({id:uid('lt'),name,paid,annualDays});saveState();render();toast('تمت إضافة نوع الإجازة')}
function editLeaveType(id){const t=getLeaveTypes().find(x=>x.id===id);if(!t)return;openModal('تعديل نوع الإجازة',`<form id="leaveTypeEditForm" class="form-grid">${field('اسم النوع','name',t.name,'text',true)}<div class="field"><label>المعاملة المالية</label><select class="select" name="paid"><option value="true" ${t.paid?'selected':''}>مدفوعة</option><option value="false" ${!t.paid?'selected':''}>بدون راتب</option></select></div>${field('الرصيد السنوي بالأيام','annualDays',t.annualDays||0,'number')}</form>`,()=>{const o=Object.fromEntries(new FormData($('#leaveTypeEditForm')).entries()),oldName=t.name;t.name=o.name.trim();t.paid=o.paid==='true';t.annualDays=Math.max(0,Number(o.annualDays||0));state.leaves.filter(l=>l.leaveTypeId===id||l.type===oldName).forEach(l=>{l.leaveTypeId=id;l.type=t.name;l.paid=t.paid});saveState();closeModal();render();toast('تم تحديث نوع الإجازة')})}
function removeLeaveType(id){if(getLeaveTypes().length<=1)return toast('يجب الإبقاء على نوع إجازة واحد على الأقل','error');if(state.leaves.some(l=>l.leaveTypeId===id))return toast('لا يمكن حذف النوع لأنه مستخدم في طلبات إجازة','error');if(!confirm('حذف نوع الإجازة؟'))return;state.settings.leaveTypes=state.settings.leaveTypes.filter(t=>t.id!==id);saveState();render();toast('تم حذف النوع')}

function orgTag(type,value){const encoded=encodeURIComponent(value).replace(/'/g,'%27');return `<span class="org-tag"><span>${escapeHTML(value)}</span><button type="button" title="حذف" onclick="removeOrgItem('${type}','${encoded}')">×</button></span>`}
function branchCard(value){const encoded=encodeURIComponent(value).replace(/'/g,'%27'),code=getBranchCurrency(value);return `<div class="branch-card"><div><strong>${escapeHTML(value)}</strong><div class="small muted">عملة الفرع</div></div><span class="currency-value">${currencyLabel(code)} — ${code}</span><div class="actions"><button class="btn btn-secondary btn-sm" type="button" onclick="editBranchCurrency('${encoded}')">تعديل العملة</button><button class="btn btn-danger btn-sm" type="button" onclick="removeOrgItem('branch','${encoded}')">حذف</button></div></div>`}
function addOrgItem(type){
  const isBranch=type==='branch',input=$(isBranch?'#newBranch':'#newDepartment'),value=input?.value.trim();
  if(!value)return toast(`اكتب اسم ${isBranch?'الفرع':'القسم'}`,'error');
  const key=isBranch?'branches':'departments',items=state.settings[key]||[];
  if(items.some(v=>v.toLowerCase()===value.toLowerCase()))return toast(`${isBranch?'الفرع':'القسم'} موجود بالفعل`,'error');
  if(isBranch){
    const currency=$('#newBranchCurrency')?.value;
    if(!CURRENCIES[currency])return toast('اختر عملة صحيحة للفرع','error');
    state.settings.branchCurrencies=state.settings.branchCurrencies||{};
    state.settings.branchCurrencies[value]=currency;
  }
  state.settings[key]=[...items,value];saveState();render();toast(`تمت إضافة ${isBranch?'الفرع وعملته':'القسم'}`);
}
function editBranchCurrency(encodedValue){
  const value=decodeURIComponent(encodedValue),current=getBranchCurrency(value);
  openModal(`تعديل عملة فرع «${escapeHTML(value)}»`,`<div class="field"><label>عملة الفرع</label><select class="select" id="editBranchCurrencySelect">${currencyOptions(current)}</select></div>`,()=>{const currency=$('#editBranchCurrencySelect').value;state.settings.branchCurrencies=state.settings.branchCurrencies||{};state.settings.branchCurrencies[value]=currency;saveState();closeModal();render();toast('تم تحديث عملة الفرع')},'حفظ العملة');
}
function removeOrgItem(type,encodedValue){
  const value=decodeURIComponent(encodedValue),isBranch=type==='branch',key=isBranch?'branches':'departments';
  if((state.settings[key]||[]).length<=1)return toast(`يجب الإبقاء على ${isBranch?'فرع':'قسم'} واحد على الأقل`,'error');
  const employeeUse=state.employees.some(e=>(isBranch?e.branch:e.department)===value);
  const financialUse=isBranch&&(state.expenses.some(x=>expenseBranch(x)===value)||state.custodies.some(x=>custodyBranch(x)===value));
  if(employeeUse||financialUse)return toast(`لا يمكن الحذف لأن ${isBranch?'الفرع مرتبط بموظفين أو مصروفات أو عهد':'القسم مرتبط بموظفين'}`,'error');
  if(!confirm(`حذف ${isBranch?'الفرع':'القسم'} «${value}»؟`))return;
  state.settings[key]=state.settings[key].filter(v=>v!==value);if(isBranch&&state.settings.branchCurrencies)delete state.settings.branchCurrencies[value];saveState();render();toast('تم الحذف');
}
function saveSettings(e){e.preventDefault();const o=Object.fromEntries(new FormData(e.target).entries());['workDays','lateDeductionPerMinute','overtimeMultiplier','overtimeRatePerHour','geofenceRadius','geofenceLat','geofenceLng'].forEach(k=>{if(k in o)o[k]=Number(o[k])});o.requireFace=o.requireFace==='true';o.requireGPS=o.requireGPS==='true';state.settings={...state.settings,...o};logAudit('تعديل الإعدادات','الإعدادات','بيانات وسياسات الشركة');saveState();render();toast('تم حفظ الإعدادات')}
function resetDemo(){if(!confirm('سيتم حذف كل التعديلات وإعادة بيانات التجربة. متابعة؟'))return;state=seed();saveState();saveSession(null);render()}

function openModal(title,body,onSave=null,saveLabel='حفظ'){
  $('#modalRoot').innerHTML=`<div class="modal-backdrop" onclick="backdropClose(event)"><div class="modal"><div class="modal-head"><h3>${title}</h3><button class="close-btn" onclick="closeModal()">×</button></div><div class="modal-body">${body}</div><div class="modal-foot">${onSave?`<button class="btn btn-primary" id="modalSave">${saveLabel}</button>`:''}<button class="btn btn-secondary" onclick="closeModal()">إغلاق</button></div></div></div>`;
  if(onSave)$('#modalSave').onclick=onSave;
}
function closeModal(){stopCamera();$('#modalRoot').innerHTML=''}
function backdropClose(e){if(e.target.classList.contains('modal-backdrop'))closeModal()}
function downloadCSV(filename,headers,rows){const esc=v=>`"${String(v??'').replace(/"/g,'""')}"`;const csv='\uFEFF'+[headers,...rows].map(r=>r.map(esc).join(',')).join('\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);toast('تم تجهيز ملف CSV')}



/* v2.2: Named company expenses + organized report center */
const APPROVAL_STATUSES=[['pending','قيد المراجعة'],['approved','معتمد'],['rejected','مرفوض']];
const AUDIENCE_OPTIONS=[['all','جميع الموظفين'],['employees','الموظفون'],['managers','المديرون'],['branch','فرع محدد']];
const EXTRA_MODULES={
  holidays:{stateKey:'holidays',label:'العطلات الرسمية',icon:'🗓',desc:'تعريف أيام العطلات الرسمية وتطبيقها على جميع الفروع أو فرع محدد.',roles:['admin','manager','employee'],addRoles:['admin'],manageRoles:['admin'],dateField:'from',branchField:'branch',defaultStatus:'active',statuses:[['active','فعالة'],['cancelled','ملغاة']],fields:[{name:'name',label:'اسم العطلة',type:'text',required:true},{name:'from',label:'من تاريخ',type:'date',required:true},{name:'to',label:'إلى تاريخ',type:'date',required:true},{name:'branch',label:'الفرع',type:'branchOptional'},{name:'paid',label:'المعاملة المالية',type:'select',options:[['true','مدفوعة'],['false','غير مدفوعة']]},{name:'notes',label:'ملاحظات',type:'textarea'}],columns:[{field:'name',label:'العطلة',type:'strong'},{field:'from',label:'من',type:'date'},{field:'to',label:'إلى',type:'date'},{field:'branch',label:'الفرع',type:'branchAll'},{field:'paid',label:'المعاملة',type:'paid'},{field:'status',label:'الحالة',type:'status'}]},
  permissions:{stateKey:'permissions',label:'الأذون الخاصة',icon:'🛏',desc:'طلبات الإذن بالساعات ومتابعة موافقات المدير.',roles:['admin','manager','employee'],addRoles:['admin','manager','employee'],manageRoles:['admin','manager'],employeeField:'employeeId',dateField:'date',defaultStatus:'pending',statuses:APPROVAL_STATUSES,fields:[{name:'employeeId',label:'الموظف',type:'employee',required:true},{name:'date',label:'التاريخ',type:'date',required:true},{name:'from',label:'من الساعة',type:'time',required:true},{name:'to',label:'إلى الساعة',type:'time',required:true},{name:'reason',label:'سبب الإذن',type:'textarea',required:true}],columns:[{field:'employeeId',label:'الموظف',type:'employee'},{field:'date',label:'التاريخ',type:'date'},{field:'from',label:'من',type:'time'},{field:'to',label:'إلى',type:'time'},{field:'reason',label:'السبب',type:'text'},{field:'status',label:'الحالة',type:'status'}]},
  decisions:{stateKey:'decisions',label:'القرارات الإدارية',icon:'⚙',desc:'أرشفة القرارات الإدارية وربطها بموظف أو فرع.',roles:['admin','manager'],addRoles:['admin','manager'],manageRoles:['admin','manager'],employeeField:'employeeId',dateField:'date',branchField:'branch',defaultStatus:'issued',statuses:[['draft','مسودة'],['issued','صادر'],['cancelled','ملغى']],fields:[{name:'number',label:'رقم القرار',type:'text',required:true},{name:'title',label:'عنوان القرار',type:'text',required:true},{name:'date',label:'التاريخ',type:'date',required:true},{name:'employeeId',label:'الموظف المعني',type:'employeeOptional'},{name:'branch',label:'الفرع',type:'branchOptional'},{name:'notes',label:'نص القرار / الملاحظات',type:'textarea',required:true}],columns:[{field:'number',label:'الرقم',type:'strong'},{field:'title',label:'العنوان',type:'text'},{field:'date',label:'التاريخ',type:'date'},{field:'employeeId',label:'الموظف',type:'employeeOptional'},{field:'branch',label:'الفرع',type:'branchAll'},{field:'status',label:'الحالة',type:'status'}]},
  meetings:{stateKey:'meetings',label:'الاجتماعات',icon:'♟',desc:'تنظيم الاجتماعات والمواعيد والحضور ومحاضر المتابعة.',roles:['admin','manager','employee'],addRoles:['admin','manager'],manageRoles:['admin','manager'],dateField:'date',defaultStatus:'scheduled',statuses:[['scheduled','مجدول'],['completed','مكتمل'],['cancelled','ملغى']],fields:[{name:'title',label:'عنوان الاجتماع',type:'text',required:true},{name:'date',label:'التاريخ',type:'date',required:true},{name:'from',label:'من الساعة',type:'time',required:true},{name:'to',label:'إلى الساعة',type:'time',required:true},{name:'location',label:'المكان / رابط الاجتماع',type:'text',required:true},{name:'attendees',label:'الحضور',type:'textarea',required:true},{name:'notes',label:'جدول الأعمال والمحضر',type:'textarea'}],columns:[{field:'title',label:'الاجتماع',type:'strong'},{field:'date',label:'التاريخ',type:'date'},{field:'from',label:'من',type:'time'},{field:'to',label:'إلى',type:'time'},{field:'location',label:'المكان',type:'text'},{field:'attendees',label:'الحضور',type:'text'},{field:'status',label:'الحالة',type:'status'}]},
  shiftRequests:{stateKey:'shiftRequests',label:'تغيير الورديات والوقت الإضافي',icon:'⏱',desc:'طلبات تغيير الوردية أو اعتماد ساعات العمل الإضافي.',roles:['admin','manager','employee'],addRoles:['admin','manager','employee'],manageRoles:['admin','manager'],employeeField:'employeeId',dateField:'date',defaultStatus:'pending',statuses:APPROVAL_STATUSES,fields:[{name:'employeeId',label:'الموظف',type:'employee',required:true},{name:'date',label:'تاريخ التنفيذ',type:'date',required:true},{name:'requestType',label:'نوع الطلب',type:'select',options:[['shift_change','تغيير وردية'],['overtime','وقت إضافي']]},{name:'targetShiftId',label:'الوردية المطلوبة',type:'shiftOptional'},{name:'hours',label:'عدد ساعات الإضافي',type:'number'},{name:'reason',label:'السبب',type:'textarea',required:true}],columns:[{field:'employeeId',label:'الموظف',type:'employee'},{field:'date',label:'التاريخ',type:'date'},{field:'requestType',label:'النوع',type:'option'},{field:'targetShiftId',label:'الوردية',type:'shift'},{field:'hours',label:'الساعات',type:'number'},{field:'status',label:'الحالة',type:'status'}]},
  biometricDevices:{stateKey:'biometricDevices',label:'الربط مع ماكينات البصمة',icon:'▦',desc:'سجل أجهزة البصمة وحالة الاتصال وآخر مزامنة.',roles:['admin','manager'],addRoles:['admin'],manageRoles:['admin'],dateField:'lastSync',branchField:'branch',defaultStatus:'disconnected',statuses:[['connected','متصل'],['disconnected','غير متصل'],['maintenance','صيانة']],fields:[{name:'name',label:'اسم الجهاز',type:'text',required:true},{name:'branch',label:'الفرع',type:'branch',required:true},{name:'deviceType',label:'نوع الجهاز',type:'text',required:true},{name:'serial',label:'السيريال',type:'text',required:true},{name:'ip',label:'عنوان IP',type:'text'},{name:'lastSync',label:'آخر مزامنة',type:'datetimeLocal'}],columns:[{field:'name',label:'الجهاز',type:'strong'},{field:'branch',label:'الفرع',type:'text'},{field:'deviceType',label:'النوع',type:'text'},{field:'serial',label:'السيريال',type:'text'},{field:'ip',label:'IP',type:'text'},{field:'lastSync',label:'آخر مزامنة',type:'datetime'},{field:'status',label:'الحالة',type:'status'}],specialAction:'syncDevice'},
  workInterruptions:{stateKey:'workInterruptions',label:'الانقطاع عن العمل',icon:'⊗',desc:'تسجيل حالات الانقطاع والعودة للعمل ومتابعة القرار.',roles:['admin','manager'],addRoles:['admin','manager'],manageRoles:['admin','manager'],employeeField:'employeeId',dateField:'from',defaultStatus:'pending',statuses:[['pending','قيد المراجعة'],['approved','معتمد'],['returned','عاد للعمل'],['closed','مغلق']],fields:[{name:'employeeId',label:'الموظف',type:'employee',required:true},{name:'from',label:'بداية الانقطاع',type:'date',required:true},{name:'to',label:'نهاية الانقطاع المتوقعة',type:'date'},{name:'reason',label:'السبب',type:'textarea',required:true},{name:'notes',label:'ملاحظات المتابعة',type:'textarea'}],columns:[{field:'employeeId',label:'الموظف',type:'employee'},{field:'from',label:'من',type:'date'},{field:'to',label:'إلى',type:'date'},{field:'reason',label:'السبب',type:'text'},{field:'status',label:'الحالة',type:'status'}]},
  evaluations:{stateKey:'evaluations',label:'برنامج التقييمات',icon:'★',desc:'تقييم أداء الموظفين وحفظ الدرجات ونقاط القوة والتطوير.',roles:['admin','manager','employee'],addRoles:['admin','manager'],manageRoles:['admin','manager'],employeeField:'employeeId',dateField:'period',defaultStatus:'draft',statuses:[['draft','مسودة'],['approved','معتمد']],fields:[{name:'employeeId',label:'الموظف',type:'employee',required:true},{name:'period',label:'فترة التقييم',type:'month',required:true},{name:'evaluatorId',label:'المقيّم',type:'employee',required:true},{name:'score',label:'الدرجة من 100',type:'number',required:true},{name:'strengths',label:'نقاط القوة',type:'textarea'},{name:'improvements',label:'فرص التحسين',type:'textarea'}],columns:[{field:'employeeId',label:'الموظف',type:'employee'},{field:'period',label:'الفترة',type:'text'},{field:'evaluatorId',label:'المقيّم',type:'employeeOptional'},{field:'score',label:'الدرجة',type:'score'},{field:'status',label:'الحالة',type:'status'}]},
  recruitment:{stateKey:'recruitment',label:'برنامج التوظيف',icon:'👤+',desc:'إدارة المرشحين والمقابلات ومراحل التوظيف.',roles:['admin','manager'],addRoles:['admin','manager'],manageRoles:['admin','manager'],dateField:'interviewDate',branchField:'branch',defaultStatus:'interview',statuses:[['draft','جديد'],['interview','مقابلة'],['offered','عرض وظيفي'],['hired','تم التعيين'],['rejected','مرفوض']],fields:[{name:'candidateName',label:'اسم المرشح',type:'text',required:true},{name:'jobTitle',label:'الوظيفة',type:'text',required:true},{name:'department',label:'القسم',type:'department',required:true},{name:'branch',label:'الفرع',type:'branch',required:true},{name:'phone',label:'الهاتف',type:'tel'},{name:'email',label:'البريد',type:'email'},{name:'interviewDate',label:'تاريخ المقابلة',type:'date'},{name:'notes',label:'ملاحظات',type:'textarea'}],columns:[{field:'candidateName',label:'المرشح',type:'strong'},{field:'jobTitle',label:'الوظيفة',type:'text'},{field:'department',label:'القسم',type:'text'},{field:'branch',label:'الفرع',type:'text'},{field:'interviewDate',label:'المقابلة',type:'date'},{field:'status',label:'المرحلة',type:'status'}]},
  terminations:{stateKey:'terminations',label:'ترك العمل وتصفية الحساب',icon:'⏻',desc:'إجراءات انتهاء الخدمة والتسوية المالية وإغلاق الملف.',roles:['admin','manager'],addRoles:['admin','manager'],manageRoles:['admin','manager'],employeeField:'employeeId',dateField:'lastWorkingDay',defaultStatus:'pending',statuses:[['pending','قيد المراجعة'],['approved','معتمد'],['settled','تمت التسوية'],['closed','مغلق']],fields:[{name:'employeeId',label:'الموظف',type:'employee',required:true},{name:'lastWorkingDay',label:'آخر يوم عمل',type:'date',required:true},{name:'reason',label:'سبب ترك العمل',type:'textarea',required:true},{name:'settlementAmount',label:'قيمة التسوية',type:'number'},{name:'notes',label:'ملاحظات وإخلاء الطرف',type:'textarea'}],columns:[{field:'employeeId',label:'الموظف',type:'employee'},{field:'lastWorkingDay',label:'آخر يوم',type:'date'},{field:'reason',label:'السبب',type:'text'},{field:'settlementAmount',label:'التسوية',type:'moneyEmployee'},{field:'status',label:'الحالة',type:'status'}]},
  advances:{stateKey:'advances',label:'سلف العاملين',icon:'💰',desc:'طلبات السلف ومبالغها وعدد الأقساط وحالة الاعتماد.',roles:['admin','manager','employee'],addRoles:['admin','manager','employee'],manageRoles:['admin','manager'],employeeField:'employeeId',dateField:'date',defaultStatus:'pending',statuses:[['pending','قيد المراجعة'],['approved','معتمد'],['paid','تم الصرف'],['rejected','مرفوض'],['closed','مغلق']],fields:[{name:'employeeId',label:'الموظف',type:'employee',required:true},{name:'date',label:'تاريخ الطلب',type:'date',required:true},{name:'amount',label:'قيمة السلفة',type:'number',required:true},{name:'installments',label:'عدد الأقساط',type:'number',required:true},{name:'startMonth',label:'بداية الخصم',type:'month',required:true},{name:'reason',label:'السبب',type:'textarea',required:true}],columns:[{field:'employeeId',label:'الموظف',type:'employee'},{field:'date',label:'التاريخ',type:'date'},{field:'amount',label:'المبلغ',type:'moneyEmployee'},{field:'installments',label:'الأقساط',type:'number'},{field:'startMonth',label:'بداية الخصم',type:'text'},{field:'status',label:'الحالة',type:'status'}]},
  tasks:{stateKey:'tasks',label:'جدول أعمال الموظف',icon:'📅',desc:'إسناد المهام ومواعيد التسليم والأولوية ونسبة الإنجاز.',roles:['admin','manager','employee'],addRoles:['admin','manager'],manageRoles:['admin','manager'],employeeField:'employeeId',dateField:'dueDate',defaultStatus:'pending',statuses:[['pending','لم يبدأ'],['in_progress','قيد التنفيذ'],['completed','مكتمل'],['cancelled','ملغى']],fields:[{name:'employeeId',label:'الموظف',type:'employee',required:true},{name:'title',label:'عنوان المهمة',type:'text',required:true},{name:'date',label:'تاريخ الإسناد',type:'date',required:true},{name:'dueDate',label:'موعد التسليم',type:'date',required:true},{name:'priority',label:'الأولوية',type:'select',options:[['high','عالية'],['medium','متوسطة'],['low','منخفضة']]},{name:'notes',label:'التفاصيل',type:'textarea'}],columns:[{field:'employeeId',label:'الموظف',type:'employee'},{field:'title',label:'المهمة',type:'strong'},{field:'dueDate',label:'موعد التسليم',type:'date'},{field:'priority',label:'الأولوية',type:'status'},{field:'status',label:'الحالة',type:'status'}]},
  dues:{stateKey:'dues',label:'صرف مستحقات العاملين',icon:'🧾',desc:'تسجيل البدلات والمستحقات ومتابعة الاعتماد والصرف.',roles:['admin','manager','employee'],addRoles:['admin','manager'],manageRoles:['admin','manager'],employeeField:'employeeId',dateField:'date',defaultStatus:'pending',statuses:[['pending','قيد المراجعة'],['approved','معتمد'],['paid','تم الصرف'],['rejected','مرفوض']],fields:[{name:'employeeId',label:'الموظف',type:'employee',required:true},{name:'date',label:'التاريخ',type:'date',required:true},{name:'type',label:'نوع المستحق',type:'text',required:true},{name:'amount',label:'المبلغ',type:'number',required:true},{name:'description',label:'البيان',type:'textarea',required:true}],columns:[{field:'employeeId',label:'الموظف',type:'employee'},{field:'date',label:'التاريخ',type:'date'},{field:'type',label:'نوع المستحق',type:'strong'},{field:'amount',label:'المبلغ',type:'moneyEmployee'},{field:'status',label:'الحالة',type:'status'}]},
  complaints:{stateKey:'complaints',label:'الشكاوى والجزاءات',icon:'⚖',desc:'تسجيل الشكاوى والتحقيق والجزاء المالي وربطه بالخصومات بعد الاعتماد.',roles:['admin','manager','employee'],addRoles:['admin','manager','employee'],manageRoles:['admin','manager'],employeeField:'employeeId',dateField:'date',defaultStatus:'open',statuses:[['open','مفتوح'],['pending','قيد التحقيق'],['approved','جزاء معتمد'],['resolved','تم الحل'],['rejected','مرفوض']],fields:[{name:'employeeId',label:'مقدم الشكوى / الموظف',type:'employee',required:true},{name:'againstEmployeeId',label:'ضد موظف',type:'employeeOptional'},{name:'type',label:'النوع',type:'select',options:[['complaint','شكوى'],['penalty','جزاء']]},{name:'date',label:'التاريخ',type:'date',required:true},{name:'title',label:'العنوان',type:'text',required:true},{name:'details',label:'التفاصيل والتحقيق',type:'textarea',required:true},{name:'penaltyAmount',label:'قيمة الجزاء المالي',type:'number'}],columns:[{field:'employeeId',label:'الموظف',type:'employee'},{field:'type',label:'النوع',type:'option'},{field:'date',label:'التاريخ',type:'date'},{field:'title',label:'العنوان',type:'strong'},{field:'penaltyAmount',label:'الجزاء',type:'moneyEmployee'},{field:'status',label:'الحالة',type:'status'}]},
  letters:{stateKey:'letters',label:'خطابات شؤون العاملين',icon:'✉',desc:'إصدار وأرشفة خطابات الموارد البشرية الخاصة بالموظفين.',roles:['admin','manager','employee'],addRoles:['admin','manager'],manageRoles:['admin','manager'],employeeField:'employeeId',dateField:'date',defaultStatus:'draft',statuses:[['draft','مسودة'],['issued','صادر'],['cancelled','ملغى']],fields:[{name:'employeeId',label:'الموظف',type:'employee',required:true},{name:'type',label:'نوع الخطاب',type:'select',options:[['مفردات مرتب','مفردات مرتب'],['خطاب خبرة','خطاب خبرة'],['تعريف بالعمل','تعريف بالعمل'],['إنذار','إنذار'],['أخرى','أخرى']]},{name:'date',label:'التاريخ',type:'date',required:true},{name:'subject',label:'الموضوع',type:'text',required:true},{name:'body',label:'نص الخطاب',type:'textarea',required:true}],columns:[{field:'employeeId',label:'الموظف',type:'employee'},{field:'type',label:'النوع',type:'strong'},{field:'date',label:'التاريخ',type:'date'},{field:'subject',label:'الموضوع',type:'text'},{field:'status',label:'الحالة',type:'status'}]},
  notifications:{stateKey:'notifications',label:'الإخطارات والإشعارات',icon:'🔔',desc:'إرسال إشعارات داخلية للجميع أو لفئة محددة.',roles:['admin','manager','employee'],addRoles:['admin','manager'],manageRoles:['admin','manager'],dateField:'date',defaultStatus:'draft',statuses:[['draft','مسودة'],['sent','تم الإرسال'],['cancelled','ملغى']],fields:[{name:'title',label:'عنوان الإشعار',type:'text',required:true},{name:'audience',label:'المستلمون',type:'select',options:AUDIENCE_OPTIONS},{name:'date',label:'تاريخ الإرسال',type:'date',required:true},{name:'message',label:'نص الإشعار',type:'textarea',required:true}],columns:[{field:'title',label:'العنوان',type:'strong'},{field:'audience',label:'الجمهور',type:'option'},{field:'date',label:'التاريخ',type:'date'},{field:'message',label:'الرسالة',type:'text'},{field:'status',label:'الحالة',type:'status'}]},
  customPages:{stateKey:'customPages',label:'مصمم الصفحات',icon:'◫',desc:'إنشاء صفحات داخلية مبسطة مثل دليل الموظف والسياسات.',roles:['admin','manager','employee'],addRoles:['admin'],manageRoles:['admin'],dateField:'updatedAt',defaultStatus:'draft',statuses:[['draft','مسودة'],['published','منشور'],['cancelled','مؤرشف']],fields:[{name:'title',label:'عنوان الصفحة',type:'text',required:true},{name:'slug',label:'الرابط المختصر',type:'text',required:true},{name:'visibility',label:'الظهور',type:'select',options:[['all','الجميع'],['employees','الموظفون'],['managers','المديرون']]},{name:'content',label:'محتوى الصفحة',type:'textarea',required:true}],columns:[{field:'title',label:'الصفحة',type:'strong'},{field:'slug',label:'الرابط',type:'text'},{field:'visibility',label:'الظهور',type:'option'},{field:'updatedAt',label:'آخر تحديث',type:'datetime'},{field:'status',label:'الحالة',type:'status'}]},
  announcements:{stateKey:'announcements',label:'الإعلانات',icon:'📣',desc:'نشر إعلانات داخلية بفترة ظهور وجمهور مستهدف.',roles:['admin','manager','employee'],addRoles:['admin','manager'],manageRoles:['admin','manager'],dateField:'from',defaultStatus:'draft',statuses:[['draft','مسودة'],['published','منشور'],['cancelled','ملغى']],fields:[{name:'title',label:'عنوان الإعلان',type:'text',required:true},{name:'from',label:'يظهر من',type:'date',required:true},{name:'to',label:'يظهر حتى',type:'date',required:true},{name:'audience',label:'الجمهور',type:'select',options:AUDIENCE_OPTIONS},{name:'message',label:'نص الإعلان',type:'textarea',required:true}],columns:[{field:'title',label:'الإعلان',type:'strong'},{field:'from',label:'من',type:'date'},{field:'to',label:'إلى',type:'date'},{field:'audience',label:'الجمهور',type:'option'},{field:'status',label:'الحالة',type:'status'}]}
};

const SERVICE_GROUPS=[
  {title:'الشركة وشؤون العاملين',items:[['organization','🏢','الشركة والهيكل الإداري'],['approvals','🔀','مسار اعتماد الطلبات'],['employees','👥','شؤون العاملين'],['selfservice','⚙','الخدمة الذاتية'],['leaves','🛏','الإجازات'],['holidays','🗓','العطلات الرسمية'],['permissions','🛌','الأذون الخاصة'],['missions','🏃','المأموريات الخارجية'],['decisions','⚙','القرارات الإدارية'],['meetings','♟','الاجتماعات']]},
  {title:'الحضور والأجور والتطوير',items:[['attendance','🖐','تسجيل الحضور والانصراف'],['shifts','⏰','الورديات ولائحة التأخيرات'],['dashboard','▣','داش بورد الموظف والمدير'],['shiftRequests','⏱','تغيير الورديات والوقت الإضافي'],['biometricDevices','▦','الربط مع ماكينات البصمة'],['workInterruptions','⊗','الانقطاع عن العمل'],['payroll','＄','برنامج الأجور والمرتبات'],['evaluations','★','برنامج التقييمات'],['recruitment','👤+','برنامج التوظيف'],['terminations','⏻','ترك العمل وتصفية الحساب']]},
  {title:'خدمات الموظفين والمحتوى',items:[['expenses','▣','مصروفات الشركة'],['custody','▤','العُهد'],['advances','💰','سلف العاملين'],['tasks','📅','جدول أعمال الموظف'],['dues','🧾','صرف مستحقات العاملين'],['complaints','⚖','الشكاوى والجزاءات'],['letters','✉','خطابات شؤون العاملين'],['notifications','🔔','الإخطارات والإشعارات'],['customPages','◫','مصمم الصفحات'],['announcements','📣','الإعلانات']]}
];

const FIXED_SERVICE_ROLES={organization:['admin','manager'],approvals:['admin','manager'],selfservice:['admin','manager','employee']};
function isServiceRouteAllowed(route,role){if(EXTRA_MODULES[route])return EXTRA_MODULES[route].roles.includes(role);if(FIXED_SERVICE_ROLES[route])return FIXED_SERVICE_ROLES[route].includes(role);return false}
function serviceAllowed(route){return canAccessRoute(route)}
function renderServiceItem(item){const [route,icon,label]=item;if(!serviceAllowed(route))return '';return `<button class="mega-service-item" onclick="go('${route}')"><span>${icon}</span><b>${label}</b></button>`}
function renderServicesMegaMenu(){return `<div class="services-menu-overlay" onclick="if(event.target===this)toggleServicesMenu()"><div class="services-mega-menu"><div class="mega-menu-head"><div><strong>كل خدمات أوربت HR</strong><small>اختر الخدمة المطلوبة</small></div><button class="close-btn" onclick="toggleServicesMenu()">×</button></div><div class="mega-groups">${SERVICE_GROUPS.map(g=>`<section><h3>${g.title}</h3><div>${g.items.map(renderServiceItem).join('')}</div></section>`).join('')}</div></div></div>`}
function renderServicesHub(){return `<div class="page-head"><div><h2>مركز الخدمات</h2><p>جميع وظائف الموارد البشرية والإدارة في شاشة واحدة، مع صلاحيات مختلفة للموظف والمدير والمسؤول.</p></div></div><div class="services-hub">${SERVICE_GROUPS.map(g=>`<section class="service-group-card"><div class="service-group-title"><h3>${g.title}</h3><span>${g.items.filter(x=>serviceAllowed(x[0])).length} خدمة</span></div><div class="service-card-grid">${g.items.map(item=>{if(!serviceAllowed(item[0]))return '';const [route,icon,label]=item,desc=EXTRA_MODULES[route]?.desc||({organization:'الفروع والأقسام والتسلسل الإداري.',approvals:'تجميع الطلبات المعلقة واعتمادها من شاشة واحدة.',employees:'ملفات الموظفين والحسابات والبيانات الوظيفية.',selfservice:'طلبات الموظف وبياناته ومهامه من مكان واحد.',leaves:'طلبات الإجازات وأنواعها والأرصدة.',missions:'المأموريات والزيارات الخارجية.',attendance:'الحضور والانصراف والموقع والتأخير.',shifts:'جداول العمل وفترات السماح.',dashboard:'مؤشرات يومية للموظف والمدير.',payroll:'احتساب الرواتب وقسائم الصرف.',expenses:'مصروفات الفروع والموردون والمرفقات وحالة الاعتماد.',custody:'العهد المالية المرتبطة بالمصروفات والأجهزة والمعدات المسلّمة.'}[route]||'خدمة إدارية متكاملة.');return `<button class="service-card" onclick="go('${route}')"><span class="service-card-icon">${icon}</span><span><strong>${label}</strong><small>${desc}</small></span><b>فتح الخدمة ←</b></button>`}).join('')}</div></section>`).join('')}</div>`}

function renderOrganization(){const branches=getBranches();return `<div class="page-head"><div><h2>الشركة والهيكل الإداري</h2><p>عرض الفروع والأقسام والتسلسل الإداري الحالي دون تغيير بيانات الموظفين.</p></div>${canAdmin()?'<button class="btn btn-primary" onclick="go(\'settings\')">إدارة الفروع والأقسام</button>':''}</div><div class="grid grid-4">${metric('⌂',branches.length,'الفروع','بعملات مستقلة')}${metric('▤',getDepartments().length,'الأقسام','الهيكل الإداري')}${metric('👥',state.employees.length,'الموظفون','إجمالي الملفات')}${metric('♟',state.employees.filter(e=>!e.managerId).length,'رؤوس الهيكل','بدون مدير مباشر')}</div><div class="organization-branches">${branches.map(b=>{const es=state.employees.filter(e=>e.branch===b),deps=[...new Set(es.map(e=>e.department))];return `<div class="card org-branch"><div class="card-title"><div><h3>${escapeHTML(b)}</h3><div class="small muted">${branchCurrencyLabel(b)}</div></div><span class="badge badge-info">${es.length} موظف</span></div><div class="org-departments">${deps.map(d=>`<div><strong>${escapeHTML(d)}</strong><span>${es.filter(e=>e.department===d).length} موظف</span></div>`).join('')||'<div class="empty">لا يوجد موظفون</div>'}</div></div>`}).join('')}</div><div class="card" style="margin-top:18px"><div class="card-title"><h3>التسلسل الإداري</h3></div><div class="org-tree">${state.employees.filter(e=>!e.managerId).map(e=>orgTreeNode(e,0)).join('')||noReportData('لا يوجد هيكل إداري')}</div></div>`}
function orgTreeNode(e,level){const children=state.employees.filter(x=>x.managerId===e.id);return `<div class="org-tree-node" style="--level:${level}"><div>${avatarHTML(e,34)}<span><strong>${escapeHTML(e.name)}</strong><small>${escapeHTML(e.jobTitle)} · ${escapeHTML(e.department)}</small></span></div>${children.map(c=>orgTreeNode(c,level+1)).join('')}</div>`}

function collectApprovalItems(){const ids=visibleEmployees().map(e=>e.id),out=[];const push=(source,label,list,dateField='date',summary=x=>x.reason||x.title||x.description||'طلب')=>list.filter(x=>x.status==='pending'&&(!x.employeeId||ids.includes(x.employeeId))).forEach(x=>out.push({source,label,id:x.id,employeeId:x.employeeId,date:x[dateField]||x.createdAt?.slice(0,10)||'',summary:summary(x)}));push('leaves','إجازة',state.leaves,'from',x=>`${x.type} · ${x.days||''} يوم`);push('missions','مأمورية',state.missions,'date',x=>`${x.title} · ${x.location}`);push('expenses','مصروف شركة',state.expenses,'date',x=>`${x.title||x.category} · ${expenseBranch(x)} · ${moneyForExpense(x)}`);push('adjustments','خصم/مكافأة',state.adjustments,'date',x=>`${adjustmentKindLabel(x.kind)} · ${adjustmentTypeLabel(x)} · ${moneyForEmployee(x.amount,x.employeeId)}`);Object.entries(EXTRA_MODULES).forEach(([route,cfg])=>{if(!cfg.statuses?.some(s=>s[0]==='pending'))return;push(route,cfg.label,state[cfg.stateKey],cfg.dateField||'date',x=>moduleRecordTitle(cfg,x))});return out.sort((a,b)=>String(b.date).localeCompare(String(a.date)))}
function renderApprovalCenter(){const list=collectApprovalItems();return `<div class="page-head"><div><h2>مسار اعتماد الطلبات</h2><p>كل الطلبات المعلقة من الإجازات والمصروفات والمأموريات والخدمات الجديدة في قائمة موحدة.</p></div></div><div class="grid grid-3">${metric('⌛',list.length,'طلبات معلقة','تحتاج قرار')}${metric('✓',countApprovedToday(),'اعتمادات اليوم','كل الخدمات')}${metric('↻',new Set(list.map(x=>x.label)).size,'أنواع الطلبات','داخل المسار')}</div><div class="card" style="margin-top:18px">${list.length?`<div class="table-wrap"><table class="table"><thead><tr><th>الخدمة</th><th>الموظف / الجهة</th><th>التاريخ</th><th>الطلب</th><th>الإجراءات</th></tr></thead><tbody>${list.map(x=>`<tr><td><span class="badge badge-info">${escapeHTML(x.label)}</span></td><td>${escapeHTML(x.source==='expenses'?expenseBranch(state.expenses.find(v=>v.id===x.id)):emp(x.employeeId)?.name||'طلب عام')}</td><td>${fmtDate(x.date)}</td><td>${escapeHTML(x.summary)}</td><td><div class="actions"><button class="btn btn-success btn-sm" onclick="unifiedApproval('${x.source}','${x.id}','approved')">اعتماد</button><button class="btn btn-danger btn-sm" onclick="unifiedApproval('${x.source}','${x.id}','rejected')">رفض</button></div></td></tr>`).join('')}</tbody></table></div>`:noReportData('لا توجد طلبات معلقة حاليًا')}</div>`}
function countApprovedToday(){let n=0;['leaves','missions','expenses','adjustments'].forEach(k=>n+=state[k].filter(x=>x.status==='approved'&&String(x.updatedAt||x.createdAt||'').startsWith(todayISO())).length);Object.values(EXTRA_MODULES).forEach(cfg=>n+=state[cfg.stateKey].filter(x=>x.status==='approved'&&String(x.updatedAt||'').startsWith(todayISO())).length);return n}
function unifiedApproval(source,id,status){let list=state[source],record=list?.find(x=>x.id===id);if(EXTRA_MODULES[source]){setModuleStatus(source,id,status);return}if(!record)return;record.status=status;record.updatedAt=new Date().toISOString();saveState();render();toast(status==='approved'?'تم اعتماد الطلب':'تم رفض الطلب')}

function renderSelfService(){const e=ownEmployee();if(!e)return noReportData('لا يوجد ملف موظف مرتبط بالحساب');const own=id=>id===e.id,requests=[...state.leaves.filter(x=>own(x.employeeId)).map(x=>({label:'إجازة',date:x.from,status:x.status,title:x.type})),...state.missions.filter(x=>own(x.employeeId)).map(x=>({label:'مأمورية',date:x.date,status:x.status,title:x.title})),...state.permissions.filter(x=>own(x.employeeId)).map(x=>({label:'إذن',date:x.date,status:x.status,title:x.reason})),...state.advances.filter(x=>own(x.employeeId)).map(x=>({label:'سلفة',date:x.date,status:x.status,title:moneyForEmployee(x.amount,e.id)}))].sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,10);return `<div class="page-head"><div><h2>الخدمة الذاتية</h2><p>بياناتك وطلباتك ومهامك وخطاباتك في مكان واحد.</p></div></div><div class="self-profile card"><div class="employee-cell">${avatarHTML(e,76)}<div><h2>${escapeHTML(e.name)}</h2><div class="muted">${escapeHTML(e.jobTitle)} · ${escapeHTML(e.department)} · ${escapeHTML(e.branch)}</div><div class="small muted" style="margin-top:6px">${e.code} · ${branchCurrencyLabel(e.branch)}</div></div></div><div class="self-quick-actions"><button onclick="leaveModal()">☂ طلب إجازة</button><button onclick="moduleModal('permissions')">🛌 طلب إذن</button><button onclick="missionModal()">⌖ طلب مأمورية</button><button onclick="moduleModal('advances')">💰 طلب سلفة</button><button onclick="moduleModal('complaints')">⚖ تقديم شكوى</button></div></div><div class="grid grid-4" style="margin-top:18px">${metric('📅',state.tasks.filter(x=>own(x.employeeId)&&x.status!=='completed').length,'مهام مفتوحة','جدول الأعمال')}${metric('▦',state.custodies.filter(x=>own(x.employeeId)&&x.status==='assigned').length,'عهد نشطة','بعهدتك')}${metric('✉',state.letters.filter(x=>own(x.employeeId)&&x.status==='issued').length,'خطابات صادرة','شؤون العاملين')}${metric('💳',state.payroll.filter(x=>own(x.employeeId)).length,'قسائم رواتب','متاحة بالحساب')}</div><div class="grid grid-2" style="margin-top:18px"><div class="card"><div class="card-title"><h3>آخر الطلبات</h3></div>${requests.length?`<div class="table-wrap"><table class="table compact-table"><thead><tr><th>الخدمة</th><th>التاريخ</th><th>البيان</th><th>الحالة</th></tr></thead><tbody>${requests.map(x=>`<tr><td>${x.label}</td><td>${fmtDate(x.date)}</td><td>${escapeHTML(x.title)}</td><td>${statusBadge(x.status)}</td></tr>`).join('')}</tbody></table></div>`:noReportData('لا توجد طلبات')}</div><div class="card"><div class="card-title"><h3>الإعلانات والإشعارات</h3></div><div class="feed-list">${[...state.announcements.filter(x=>x.status==='published'),...state.notifications.filter(x=>x.status==='sent')].slice(0,8).map(x=>`<article><strong>${escapeHTML(x.title)}</strong><p>${escapeHTML(x.message)}</p><small>${fmtDate(x.from||x.date)}</small></article>`).join('')||'<div class="empty">لا توجد إعلانات</div>'}</div></div></div>`}

function moduleCanAdd(cfg){return cfg.addRoles.includes(currentUser.role)||((currentUser.role!=='employee'||userHasCustomPermissions(currentUser))&&canAccessRoute(currentView))}
function moduleCanManage(cfg){return cfg.manageRoles.includes(currentUser.role)||((currentUser.role!=='employee'||userHasCustomPermissions(currentUser))&&canAccessRoute(currentView))}
function moduleVisibleRecords(cfg){let list=[...state[cfg.stateKey]];if(cfg.employeeField){const ids=visibleEmployees().map(e=>e.id);list=list.filter(x=>ids.includes(x[cfg.employeeField]))}return list.sort((a,b)=>String(b[cfg.dateField]||b.updatedAt||b.createdAt||'').localeCompare(String(a[cfg.dateField]||a.updatedAt||a.createdAt||'')))}
function renderGenericModule(route){const cfg=EXTRA_MODULES[route],list=moduleVisibleRecords(cfg),pending=list.filter(x=>x.status==='pending').length,done=list.filter(x=>['approved','completed','paid','issued','sent','published','connected','resolved','hired','settled','closed'].includes(x.status)).length;return `<div class="page-head"><div><h2>${cfg.icon} ${cfg.label}</h2><p>${cfg.desc}</p></div>${moduleCanAdd(cfg)?`<button class="btn btn-primary" onclick="moduleModal('${route}')">＋ إضافة جديد</button>`:''}</div>${route==='biometricDevices'?'<div class="notice">إدارة الأجهزة والمزامنة التجريبية تعمل محليًا. الربط الفعلي يتطلب API أو SDK خاص بموديل جهاز البصمة.</div>':''}<div class="grid grid-3">${metric(cfg.icon,list.length,'إجمالي السجلات','داخل صلاحيتك')}${metric('⌛',pending,'قيد المراجعة','طلبات معلقة')}${metric('✓',done,'منجز / معتمد','سجلات مكتملة')}</div><div class="card" style="margin-top:18px"><div class="toolbar"><input class="input" id="moduleSearch" placeholder="بحث داخل ${cfg.label}" oninput="filterModuleRows('${route}')"><select class="select" id="moduleStatus" onchange="filterModuleRows('${route}')"><option value="">كل الحالات</option>${(cfg.statuses||[]).map(s=>`<option value="${s[0]}">${s[1]}</option>`).join('')}</select>${cfg.branchField?`<select class="select" id="moduleBranch" onchange="filterModuleRows('${route}')"><option value="">كل الفروع</option>${getBranches().map(b=>`<option>${escapeHTML(b)}</option>`).join('')}</select>`:''}<button class="btn btn-secondary" onclick="exportModuleCSV('${route}')">⇩ تصدير CSV</button></div>${list.length?`<div class="table-wrap"><table class="table module-table" id="moduleTable"><thead><tr>${cfg.columns.map(c=>`<th>${c.label}</th>`).join('')}<th>إجراءات</th></tr></thead><tbody>${list.map(r=>moduleTableRow(route,cfg,r)).join('')}</tbody></table></div>`:noReportData(`لا توجد سجلات في ${cfg.label}`)}</div>`}
function moduleTableRow(route,cfg,r){const search=cfg.columns.map(c=>modulePlainValue(cfg,r,c)).join(' ').toLowerCase(),branch=cfg.branchField?r[cfg.branchField]||'':'';return `<tr data-record-id="${r.id}" data-search="${escapeHTML(search)}" data-status="${escapeHTML(r.status||'')}" data-branch="${escapeHTML(branch)}">${cfg.columns.map(c=>`<td>${moduleDisplayValue(cfg,r,c)}</td>`).join('')}<td><div class="actions"><button class="btn btn-secondary btn-sm" onclick="viewModuleRecord('${route}','${r.id}')">عرض</button>${moduleCanManage(cfg)?`<button class="btn btn-secondary btn-sm" onclick="moduleModal('${route}','${r.id}')">تعديل</button>${r.status==='pending'?`<button class="btn btn-success btn-sm" onclick="setModuleStatus('${route}','${r.id}','approved')">اعتماد</button><button class="btn btn-danger btn-sm" onclick="setModuleStatus('${route}','${r.id}','rejected')">رفض</button>`:''}${cfg.specialAction==='syncDevice'?`<button class="btn btn-success btn-sm" onclick="syncBiometricDevice('${r.id}')">مزامنة</button>`:''}`:''}${canAdmin()?`<button class="btn btn-danger btn-sm" onclick="deleteModuleRecord('${route}','${r.id}')">حذف</button>`:''}</div></td></tr>`}
function filterModuleRows(){const q=$('#moduleSearch')?.value.trim().toLowerCase()||'',status=$('#moduleStatus')?.value||'',branch=$('#moduleBranch')?.value||'';$$('#moduleTable tbody tr').forEach(r=>r.style.display=(!q||r.dataset.search.includes(q))&&(!status||r.dataset.status===status)&&(!branch||r.dataset.branch===branch)?'':'none')}
function moduleFieldConfig(cfg,name){return cfg.fields.find(f=>f.name===name)}
function moduleOptionLabel(field,value){const opts=typeof field?.options==='function'?field.options():field?.options||[];return opts.find(o=>String(o[0])===String(value))?.[1]||value||'-'}
function modulePlainValue(cfg,r,c){const v=r[c.field];if(c.type==='employee'||c.type==='employeeOptional')return emp(v)?.name||'-';if(c.type==='status')return statusText(v);if(c.type==='shift')return shift(v)?.name||'-';if(c.type==='option')return moduleOptionLabel(moduleFieldConfig(cfg,c.field),v);if(c.type==='branchAll')return v||'جميع الفروع';if(c.type==='paid')return String(v)==='false'?'غير مدفوعة':'مدفوعة';return v??''}
function moduleDisplayValue(cfg,r,c){const v=r[c.field];if(c.type==='employee'||c.type==='employeeOptional'){const e=emp(v);return e?`<div class="employee-cell">${avatarHTML(e,30)}<div><strong>${escapeHTML(e.name)}</strong><div class="small muted">${escapeHTML(e.department)} · ${escapeHTML(e.branch)}</div></div></div>`:'<span class="muted">عام</span>'}if(c.type==='date')return fmtDate(v);if(c.type==='time')return escapeHTML(v||'-');if(c.type==='datetime')return v?`${fmtDate(String(v).slice(0,10))} ${String(v).slice(11,16)}`:'-';if(c.type==='status')return statusBadge(v);if(c.type==='strong')return `<strong>${escapeHTML(v||'-')}</strong>`;if(c.type==='text')return `<span title="${escapeHTML(v||'')}">${escapeHTML(String(v||'-').slice(0,80))}</span>`;if(c.type==='branchAll')return escapeHTML(v||'جميع الفروع');if(c.type==='paid')return `<span class="badge ${String(v)==='false'?'badge-danger':'badge-success'}">${String(v)==='false'?'غير مدفوعة':'مدفوعة'}</span>`;if(c.type==='moneyEmployee')return moneyForEmployee(v,r.employeeId);if(c.type==='score')return `<strong>${Number(v||0)}%</strong><div class="progress mini"><span style="width:${Math.min(100,Number(v||0))}%"></span></div>`;if(c.type==='shift')return escapeHTML(shift(v)?.name||'-');if(c.type==='option')return escapeHTML(moduleOptionLabel(moduleFieldConfig(cfg,c.field),v));return escapeHTML(v??'-')}
function defaultRecord(cfg){const r={status:cfg.defaultStatus||'draft',createdAt:new Date().toISOString()};cfg.fields.forEach(f=>{if(f.type==='date')r[f.name]=todayISO();else if(f.type==='month')r[f.name]=monthISO();else if(f.type==='employee')r[f.name]=ownEmployee()?.id||visibleEmployees()[0]?.id||'';else if(f.type==='branch')r[f.name]=ownEmployee()?.branch||getBranches()[0]||'';else if(f.type==='department')r[f.name]=ownEmployee()?.department||getDepartments()[0]||'';else if(f.type==='number')r[f.name]=0;else if(f.type==='select')r[f.name]=(typeof f.options==='function'?f.options():f.options||[])[0]?.[0]||'';else r[f.name]=''});return r}
function moduleModal(route,id=''){const cfg=EXTRA_MODULES[route],r=id?state[cfg.stateKey].find(x=>x.id===id):defaultRecord(cfg);openModal(id?`تعديل: ${cfg.label}`:`إضافة: ${cfg.label}`,`<form id="moduleForm" class="form-grid">${cfg.fields.map(f=>renderModuleField(f,r[f.name])).join('')}${moduleCanManage(cfg)&&cfg.statuses?`<div class="field"><label>الحالة</label><select class="select" name="status">${cfg.statuses.map(x=>`<option value="${x[0]}" ${r.status===x[0]?'selected':''}>${x[1]}</option>`).join('')}</select></div>`:''}</form>`,()=>saveModuleRecord(route,id))}
function renderModuleField(f,value){if(f.type==='employee'||f.type==='employeeOptional'){if(currentUser.role==='employee'&&!canManage()&&f.type==='employee')return `<div class="field"><label>${f.label}</label><input type="hidden" name="${f.name}" value="${ownEmployee()?.id||''}"><div class="input readonly-input">${escapeHTML(ownEmployee()?.name||'-')}</div></div>`;return `<div class="field"><label>${f.label}</label><select class="select" name="${f.name}" ${f.required?'required':''}>${f.type==='employeeOptional'?'<option value="">بدون / عام</option>':''}${visibleEmployees().map(e=>`<option value="${e.id}" ${e.id===value?'selected':''}>${escapeHTML(e.name)} — ${escapeHTML(e.branch)}</option>`).join('')}</select></div>`}if(f.type==='branch'||f.type==='branchOptional')return `<div class="field"><label>${f.label}</label><select class="select" name="${f.name}" ${f.required?'required':''}>${f.type==='branchOptional'?'<option value="">جميع الفروع</option>':''}${getBranches().map(b=>`<option value="${escapeHTML(b)}" ${b===value?'selected':''}>${escapeHTML(b)}</option>`).join('')}</select></div>`;if(f.type==='department')return `<div class="field"><label>${f.label}</label><select class="select" name="${f.name}" required>${getDepartments().map(d=>`<option value="${escapeHTML(d)}" ${d===value?'selected':''}>${escapeHTML(d)}</option>`).join('')}</select></div>`;if(f.type==='shiftOptional')return `<div class="field"><label>${f.label}</label><select class="select" name="${f.name}"><option value="">غير محدد</option>${state.shifts.map(x=>`<option value="${x.id}" ${x.id===value?'selected':''}>${escapeHTML(x.name)}</option>`).join('')}</select></div>`;if(f.type==='select'){const opts=typeof f.options==='function'?f.options():f.options||[];return `<div class="field"><label>${f.label}</label><select class="select" name="${f.name}">${opts.map(x=>`<option value="${escapeHTML(x[0])}" ${String(x[0])===String(value)?'selected':''}>${escapeHTML(x[1])}</option>`).join('')}</select></div>`}if(f.type==='textarea')return `<div class="field full"><label>${f.label}</label><textarea class="textarea" name="${f.name}" rows="4" ${f.required?'required':''}>${escapeHTML(value||'')}</textarea></div>`;const type=f.type==='datetimeLocal'?'datetime-local':f.type;let val=value||'';if(type==='datetime-local'&&val)val=String(val).slice(0,16);return `<div class="field"><label>${f.label}</label><input class="input" name="${f.name}" type="${type}" ${type==='number'?'step="any"':''} value="${escapeHTML(val)}" ${f.required?'required':''}></div>`}
function saveModuleRecord(route,id){const cfg=EXTRA_MODULES[route],form=$('#moduleForm');if(!form.reportValidity())return;const o=Object.fromEntries(new FormData(form).entries());cfg.fields.filter(f=>f.type==='number').forEach(f=>o[f.name]=Number(o[f.name]||0));if(!moduleCanManage(cfg))o.status=cfg.defaultStatus||'pending';if(cfg.employeeField&&currentUser.role==='employee'&&!canManage())o[cfg.employeeField]=ownEmployee()?.id||'';if(o.from&&o.to&&String(o.to)<String(o.from)&&!o.from.includes(':'))return toast('تاريخ النهاية يجب ألا يسبق البداية','error');let record;if(id){record=state[cfg.stateKey].find(x=>x.id===id);Object.assign(record,o,{updatedAt:new Date().toISOString()})}else{record={id:uid(route.slice(0,3)),...o,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),createdBy:currentUser.id};state[cfg.stateKey].push(record)}applyModuleSideEffects(route,record);saveState();closeModal();render();toast('تم حفظ السجل بنجاح')}
function setModuleStatus(route,id,status){const cfg=EXTRA_MODULES[route],r=state[cfg.stateKey].find(x=>x.id===id);if(!r)return;r.status=status;r.updatedAt=new Date().toISOString();applyModuleSideEffects(route,r);saveState();render();toast(`تم تحديث الحالة إلى: ${statusText(status)}`)}
function applyModuleSideEffects(route,r){if(route==='shiftRequests'&&r.status==='approved'&&r.requestType==='shift_change'&&r.targetShiftId){const e=emp(r.employeeId);if(e)e.shiftId=r.targetShiftId}if(route==='terminations'&&['settled','closed'].includes(r.status)){const e=emp(r.employeeId);if(e)e.status='inactive';const u=employeeAccount(r.employeeId);if(u)u.active=false}if(route==='complaints'&&r.status==='approved'&&Number(r.penaltyAmount)>0){const target=r.againstEmployeeId||r.employeeId;if(r.linkedAdjustmentId){const a=state.adjustments.find(x=>x.id===r.linkedAdjustmentId);if(a)Object.assign(a,{employeeId:target,date:r.date,deductionType:'جزاء إداري',calculationMethod:'fixed',days:0,dailyRate:0,workDaysBasis:0,amount:Number(r.penaltyAmount),reason:`جزاء: ${r.title}`,status:'approved'})}else{const a={id:uid('adj'),kind:'deduction',employeeId:target,date:r.date,deductionType:'جزاء إداري',calculationMethod:'fixed',days:0,dailyRate:0,workDaysBasis:0,amount:Number(r.penaltyAmount),reason:`جزاء: ${r.title}`,status:'approved',createdAt:new Date().toISOString()};state.adjustments.push(a);r.linkedAdjustmentId=a.id}}}
function deleteModuleRecord(route,id){const cfg=EXTRA_MODULES[route];if(!confirm(`حذف السجل من ${cfg.label}؟`))return;const r=state[cfg.stateKey].find(x=>x.id===id);if(route==='complaints'&&r?.linkedAdjustmentId)state.adjustments=state.adjustments.filter(x=>x.id!==r.linkedAdjustmentId);state[cfg.stateKey]=state[cfg.stateKey].filter(x=>x.id!==id);saveState();render();toast('تم حذف السجل')}
function moduleRecordTitle(cfg,r){for(const key of ['title','name','candidateName','subject','type','item','reason'])if(r[key])return String(r[key]);return cfg.label}
function viewModuleRecord(route,id){const cfg=EXTRA_MODULES[route],r=state[cfg.stateKey].find(x=>x.id===id);if(!r)return;openModal(`${cfg.icon} ${cfg.label}`,`<div class="record-view"><div class="record-view-title"><strong>${escapeHTML(moduleRecordTitle(cfg,r))}</strong>${statusBadge(r.status)}</div><div class="record-view-grid">${cfg.fields.map(f=>`<div><span>${f.label}</span><strong>${moduleDisplayValue(cfg,r,{field:f.name,type:f.type==='employee'?'employeeOptional':f.type==='number'?'number':f.type==='select'?'option':f.type==='date'?'date':f.type==='time'?'time':f.type==='month'?'text':f.type==='textarea'?'text':'text'})}</strong></div>`).join('')}</div></div>`)}
function syncBiometricDevice(id){const r=state.biometricDevices.find(x=>x.id===id);if(!r)return;r.lastSync=new Date().toISOString();r.status='connected';r.updatedAt=new Date().toISOString();saveState();render();toast('تمت مزامنة الجهاز تجريبيًا')}
function exportModuleCSV(route){const cfg=EXTRA_MODULES[route],list=moduleVisibleRecords(cfg),headers=cfg.columns.map(c=>c.label),rows=list.map(r=>cfg.columns.map(c=>modulePlainValue(cfg,r,c)));downloadCSV(`orbit-${route}-${todayISO()}.csv`,headers,rows)}



/* ===== الملفات والعقود والتنبيهات ===== */
const DOCUMENT_CATEGORIES=DEFAULT_DOCUMENT_CATEGORIES;
function daysUntil(date){if(!date)return 99999;const a=new Date(todayISO()+'T12:00:00'),b=new Date(date+'T12:00:00');return Math.ceil((b-a)/86400000)}
function documentStatus(x){if(!x.expiryDate)return 'no_expiry';const d=daysUntil(x.expiryDate);return d<0?'expired':d<=30?'expiring':'active'}
function documentStatusText(x){return {expired:'منتهي',expiring:'قارب على الانتهاء',active:'ساري',no_expiry:'بدون تاريخ انتهاء'}[documentStatus(x)]}
function documentStatusBadge(x){const st=documentStatus(x),type={expired:'danger',expiring:'warning',active:'success',no_expiry:'neutral'}[st];return `<span class="badge badge-${type}">${documentStatusText(x)}</span>`}
function visibleDocuments(){const ids=visibleEmployees().map(e=>e.id);return state.documents.filter(x=>ids.includes(x.employeeId))}
function hrAlerts(ids=visibleEmployees().map(e=>e.id)){
  const rows=[];
  state.documents.filter(x=>ids.includes(x.employeeId)&&x.expiryDate).forEach(x=>{const d=daysUntil(x.expiryDate);if(d>=0&&d<=45)rows.push({icon:'📄',level:d<=7?'danger':'warning',days:d,title:`${x.category}: ${x.title}`,details:`${emp(x.employeeId)?.name||'-'} — ينتهي ${fmtDate(x.expiryDate)}`})});
  state.employees.filter(e=>ids.includes(e.id)).forEach(e=>{
    if(e.contractEnd){const d=daysUntil(e.contractEnd);if(d>=0&&d<=45)rows.push({icon:'📝',level:d<=7?'danger':'warning',days:d,title:'نهاية عقد موظف',details:`${e.name} — ${fmtDate(e.contractEnd)}`})}
    if(e.probationEnd){const d=daysUntil(e.probationEnd);if(d>=0&&d<=30)rows.push({icon:'⏳',level:'info',days:d,title:'نهاية فترة التجربة',details:`${e.name} — ${fmtDate(e.probationEnd)}`})}
  });
  return rows.sort((a,b)=>a.days-b.days);
}
function renderDocuments(){
  const list=[...visibleDocuments()].sort((a,b)=>String(a.expiryDate||'9999').localeCompare(String(b.expiryDate||'9999'))),expiring=list.filter(x=>documentStatus(x)==='expiring'),expired=list.filter(x=>documentStatus(x)==='expired');
  return `<div class="page-head"><div><h2>العقود والمستندات</h2><p>حفظ عقود الموظفين والهويات والمؤهلات والمرفقات مع تنبيهات تلقائية قبل الانتهاء.</p></div>${canManage()?'<button class="btn btn-primary" onclick="documentModal()">＋ مستند جديد</button>':''}</div>
  <div class="grid grid-4">${metric('📁',list.length,'إجمالي المستندات','داخل صلاحيتك')}${metric('⚠',expiring.length,'تنتهي خلال 30 يومًا','تحتاج متابعة')}${metric('×',expired.length,'مستندات منتهية','تحتاج تجديد')}${metric('📎',list.filter(x=>x.attachmentData).length,'ملفات مرفوعة','محفوظة محليًا')}</div>
  <div class="card" style="margin-top:18px"><div class="toolbar"><input class="input" id="documentSearch" placeholder="بحث بالموظف أو المستند أو الرقم" oninput="filterDocumentRows()"><select class="select" id="documentStatusFilter" onchange="filterDocumentRows()"><option value="">كل الحالات</option><option value="active">ساري</option><option value="expiring">قارب على الانتهاء</option><option value="expired">منتهي</option><option value="no_expiry">بدون انتهاء</option></select><button class="btn btn-secondary" onclick="exportDocumentsCSV()">⇩ تصدير CSV</button></div>
  <div class="table-wrap"><table class="table" id="documentsTable"><thead><tr><th>الموظف</th><th>الفئة / العنوان</th><th>الرقم</th><th>الإصدار</th><th>الانتهاء</th><th>الحالة</th><th>المرفق</th><th>إجراءات</th></tr></thead><tbody>${list.map(x=>{const e=emp(x.employeeId),st=documentStatus(x);return `<tr data-record-id="${x.id}" data-search="${escapeHTML(`${e?.name||''} ${e?.code||''} ${x.category} ${x.title} ${x.number||''}`.toLowerCase())}" data-status="${st}"><td><div class="employee-cell">${avatarHTML(e,32)}<div><strong>${escapeHTML(e?.name||'-')}</strong><div class="small muted">${escapeHTML(e?.department||'')} · ${escapeHTML(e?.branch||'')}</div></div></div></td><td><strong>${escapeHTML(x.category)}</strong><div class="small muted">${escapeHTML(x.title)}</div></td><td>${escapeHTML(x.number||'-')}</td><td>${fmtDate(x.issueDate)}</td><td>${fmtDate(x.expiryDate)}</td><td>${documentStatusBadge(x)}${x.expiryDate&&st!=='expired'?`<div class="small muted" style="margin-top:4px">متبقي ${daysUntil(x.expiryDate)} يوم</div>`:''}</td><td>${documentAttachmentCell(x)}</td><td><div class="actions"><button class="btn btn-secondary btn-sm" onclick="viewDocument('${x.id}')">عرض</button>${canManage()?`<button class="btn btn-secondary btn-sm" onclick="documentModal('${x.id}')">تعديل</button><button class="btn btn-danger btn-sm" onclick="deleteDocument('${x.id}')">حذف</button>`:''}</div></td></tr>`}).join('')||`<tr><td colspan="8">${noReportData('لا توجد مستندات')}</td></tr>`}</tbody></table></div></div>`;
}
function filterDocumentRows(){const q=$('#documentSearch')?.value.trim().toLowerCase()||'',st=$('#documentStatusFilter')?.value||'';$$('#documentsTable tbody tr').forEach(r=>r.style.display=(!q||r.dataset.search?.includes(q))&&(!st||r.dataset.status===st)?'':'none')}
function documentAttachmentCell(x){if(!x.attachmentData)return x.attachmentName?`<span class="badge badge-neutral">📎 ${escapeHTML(x.attachmentName)}</span>`:'<span class="muted">بدون مرفق</span>';return `<div class="actions"><button class="link-btn" onclick="openDocumentAttachment('${x.id}')">فتح</button><button class="link-btn" onclick="downloadDocumentAttachment('${x.id}')">تحميل</button></div>`}
function documentModal(id=''){
  const x=id?state.documents.find(v=>v.id===id):null;pendingDocumentAttachment=x?.attachmentName?{name:x.attachmentName,type:x.attachmentType,data:x.attachmentData||'',size:x.attachmentSize||0}:null;
  openModal(id?'تعديل مستند موظف':'إضافة مستند موظف',`<form id="documentForm" class="form-grid"><div class="field"><label>الموظف</label><select class="select" name="employeeId" required>${visibleEmployees().map(e=>`<option value="${e.id}" ${e.id===x?.employeeId?'selected':''}>${escapeHTML(e.name)} — ${escapeHTML(e.branch)}</option>`).join('')}</select></div><div class="field"><label>فئة المستند</label><select class="select" name="category">${documentCategoryOptions(x?.category||getDocumentCategories()[0]||'')}</select></div>${field('عنوان المستند','title',x?.title||'','text',true)}${field('رقم المستند / العقد','number',x?.number||'','text')}${field('تاريخ الإصدار','issueDate',x?.issueDate||todayISO(),'date')}${field('تاريخ الانتهاء','expiryDate',x?.expiryDate||'','date')}<div class="field full"><label>ملاحظات</label><textarea class="textarea" name="notes" rows="3">${escapeHTML(x?.notes||'')}</textarea></div><div class="field full"><label>الملف المرفق</label><div class="expense-upload-box"><input class="input" id="documentAttachmentInput" type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" onchange="handleDocumentAttachment(this)"><div class="help">الحد الأقصى 2 ميجابايت، وتُضغط الصور تلقائيًا.</div><div id="documentAttachmentPreview">${documentAttachmentPreviewHTML()}</div></div></div></form>`,()=>saveDocument(id));
}
function documentAttachmentPreviewHTML(){if(!pendingDocumentAttachment)return '<div class="attachment-empty">لم يتم اختيار ملف</div>';return `<div class="attachment-preview"><div class="attachment-doc-icon">📄</div><div><strong>${escapeHTML(pendingDocumentAttachment.name||'ملف')}</strong><small>${pendingDocumentAttachment.size?formatFileSize(pendingDocumentAttachment.size):'ملف محفوظ'}</small></div><button class="btn btn-danger btn-sm" type="button" onclick="removeDocumentAttachment()">إزالة</button></div>`}
function removeDocumentAttachment(){pendingDocumentAttachment=null;const el=$('#documentAttachmentPreview');if(el)el.innerHTML=documentAttachmentPreviewHTML();const input=$('#documentAttachmentInput');if(input)input.value=''}
async function handleDocumentAttachment(input){const file=input.files?.[0];if(!file)return;try{pendingDocumentAttachment=await prepareExpenseAttachment(file);const el=$('#documentAttachmentPreview');if(el)el.innerHTML=documentAttachmentPreviewHTML();toast('تم تجهيز الملف')}catch(e){input.value='';toast(e?.message||'تعذر قراءة الملف','error')}}
function saveDocument(id=''){const f=$('#documentForm');if(!f?.reportValidity())return;const o=Object.fromEntries(new FormData(f).entries());if(o.issueDate&&o.expiryDate&&o.expiryDate<o.issueDate)return toast('تاريخ الانتهاء يجب ألا يسبق الإصدار','error');const a=pendingDocumentAttachment||{},payload={...o,attachmentName:a.name||'',attachmentType:a.type||'',attachmentSize:a.size||0,attachmentData:a.data||'',updatedAt:new Date().toISOString()};try{if(id)Object.assign(state.documents.find(x=>x.id===id),payload);else state.documents.push({id:uid('doc'),...payload,createdAt:new Date().toISOString(),createdBy:currentUser.id});logAudit(id?'تعديل مستند':'إضافة مستند','العقود والمستندات',`${emp(o.employeeId)?.name||''} — ${o.title}`);saveState();closeModal();render();toast('تم حفظ المستند')}catch{return toast('تعذر الحفظ؛ قد تكون مساحة المتصفح ممتلئة','error')}}
function viewDocument(id){const x=state.documents.find(v=>v.id===id),e=emp(x?.employeeId);if(!x)return;openModal('تفاصيل المستند',`<div class="record-view"><div class="record-view-title"><strong>${escapeHTML(x.title)}</strong>${documentStatusBadge(x)}</div><div class="record-view-grid"><div><span>الموظف</span><strong>${escapeHTML(e?.name||'-')}</strong></div><div><span>الفئة</span><strong>${escapeHTML(x.category)}</strong></div><div><span>الرقم</span><strong>${escapeHTML(x.number||'-')}</strong></div><div><span>تاريخ الإصدار</span><strong>${fmtDate(x.issueDate)}</strong></div><div><span>تاريخ الانتهاء</span><strong>${fmtDate(x.expiryDate)}</strong></div><div><span>المرفق</span>${documentAttachmentCell(x)}</div><div class="full"><span>ملاحظات</span><strong>${escapeHTML(x.notes||'-')}</strong></div></div></div>`)}
function openDocumentAttachment(id){const x=state.documents.find(v=>v.id===id);if(!x?.attachmentData)return toast('لا يوجد ملف محفوظ','error');const blob=dataURLToBlob(x.attachmentData),url=URL.createObjectURL(blob);if(String(x.attachmentType||'').startsWith('image/')||x.attachmentType==='application/pdf'){window.open(url,'_blank','noopener');setTimeout(()=>URL.revokeObjectURL(url),60000)}else{downloadDocumentAttachment(id);URL.revokeObjectURL(url)}}
function downloadDocumentAttachment(id){const x=state.documents.find(v=>v.id===id);if(!x?.attachmentData)return toast('لا يوجد ملف محفوظ','error');const blob=dataURLToBlob(x.attachmentData),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=x.attachmentName||'employee-document';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function deleteDocument(id){const x=state.documents.find(v=>v.id===id);if(!x||!confirm('حذف المستند والملف المرفق؟'))return;state.documents=state.documents.filter(v=>v.id!==id);logAudit('حذف مستند','العقود والمستندات',x.title);saveState();render();toast('تم حذف المستند')}
function exportDocumentsCSV(){downloadCSV(`orbit-documents-${todayISO()}.csv`,['الكود','الموظف','القسم','الفرع','الفئة','العنوان','الرقم','الإصدار','الانتهاء','الحالة','المرفق'],visibleDocuments().map(x=>{const e=emp(x.employeeId);return [e?.code||'',e?.name||'',e?.department||'',e?.branch||'',x.category,x.title,x.number||'',x.issueDate||'',x.expiryDate||'',documentStatusText(x),x.attachmentName||'']}))}
function documentReportTable(list){return `<div class="table-wrap"><table class="table report-detail-table"><thead><tr><th>الموظف</th><th>القسم</th><th>الفرع</th><th>الفئة</th><th>العنوان</th><th>الرقم</th><th>الإصدار</th><th>الانتهاء</th><th>الحالة</th></tr></thead><tbody>${list.map(x=>{const e=emp(x.employeeId);return `<tr><td>${escapeHTML(e?.name||'-')}</td><td>${escapeHTML(e?.department||'-')}</td><td>${escapeHTML(e?.branch||'-')}</td><td>${escapeHTML(x.category)}</td><td>${escapeHTML(x.title)}</td><td>${escapeHTML(x.number||'-')}</td><td>${fmtDate(x.issueDate)}</td><td>${fmtDate(x.expiryDate)}</td><td>${documentStatusBadge(x)}</td></tr>`}).join('')}</tbody></table></div>`}
function renderDocumentsReport(ctx){const expiring=ctx.documents.filter(x=>documentStatus(x)==='expiring'),expired=ctx.documents.filter(x=>documentStatus(x)==='expired');const content=`<div class="grid grid-4">${metric('📁',ctx.documents.length,'إجمالي المستندات','داخل الفلاتر')}${metric('⚠',expiring.length,'قريبة الانتهاء','خلال 30 يومًا')}${metric('×',expired.length,'منتهية','تحتاج تجديد')}${metric('📎',ctx.documents.filter(x=>x.attachmentData).length,'بمرفقات','ملفات محفوظة')}</div>${reportSection('تفاصيل العقود والمستندات',ctx.documents.length?documentReportTable(ctx.documents):noReportData('لا توجد مستندات داخل النطاق'))}`;return reportDocument('تقرير العقود والمستندات',ctx,content,'العقود والهويات والمؤهلات وتواريخ الانتهاء وحالة التجديد.')}

/* ===== سجل النظام والنسخ الاحتياطي ===== */
function renderAuditLog(){const list=state.auditLog||[];return `<div class="page-head"><div><h2>سجل النظام</h2><p>سجل زمني لأهم عمليات الدخول والتعديل والاعتماد والحذف والنسخ الاحتياطي.</p></div><div class="actions"><button class="btn btn-secondary" onclick="exportAuditCSV()">⇩ تصدير CSV</button><button class="btn btn-danger" onclick="clearAuditLog()">مسح السجل</button></div></div><div class="grid grid-4">${metric('🛡',list.length,'إجمالي العمليات','آخر 1000 عملية')}${metric('👤',new Set(list.map(x=>x.userName)).size,'مستخدمون','ظهروا في السجل')}${metric('✎',list.filter(x=>/إضافة|تعديل|حفظ/.test(x.action)).length,'عمليات تعديل','مسجلة')}${metric('×',list.filter(x=>/حذف|رفض/.test(x.action)).length,'حذف أو رفض','مسجل')}</div><div class="card" style="margin-top:18px"><div class="toolbar"><input class="input" id="auditSearch" placeholder="بحث بالمستخدم أو العملية أو القسم" oninput="filterAuditRows()"><select class="select" id="auditModule" onchange="filterAuditRows()"><option value="">كل الأقسام</option>${[...new Set(list.map(x=>x.module))].filter(Boolean).map(v=>`<option>${escapeHTML(v)}</option>`).join('')}</select></div><div class="table-wrap"><table class="table" id="auditTable"><thead><tr><th>التاريخ والوقت</th><th>المستخدم</th><th>العملية</th><th>القسم</th><th>التفاصيل</th></tr></thead><tbody>${list.map(x=>`<tr data-search="${escapeHTML(`${x.userName} ${x.action} ${x.module} ${x.details}`.toLowerCase())}" data-module="${escapeHTML(x.module||'')}"><td>${new Intl.DateTimeFormat('ar-EG',{dateStyle:'medium',timeStyle:'short'}).format(new Date(x.date))}</td><td>${escapeHTML(x.userName||'النظام')}</td><td><strong>${escapeHTML(x.action)}</strong></td><td><span class="badge badge-info">${escapeHTML(x.module||'-')}</span></td><td>${escapeHTML(x.details||'-')}</td></tr>`).join('')||`<tr><td colspan="5">${noReportData('السجل فارغ')}</td></tr>`}</tbody></table></div></div>`}
function filterAuditRows(){const q=$('#auditSearch')?.value.trim().toLowerCase()||'',m=$('#auditModule')?.value||'';$$('#auditTable tbody tr').forEach(r=>r.style.display=(!q||r.dataset.search?.includes(q))&&(!m||r.dataset.module===m)?'':'none')}
function exportAuditCSV(){downloadCSV(`orbit-audit-${todayISO()}.csv`,['التاريخ','المستخدم','العملية','القسم','التفاصيل'],(state.auditLog||[]).map(x=>[x.date,x.userName,x.action,x.module,x.details]))}
function clearAuditLog(){if(!confirm('مسح سجل النظام بالكامل؟'))return;state.auditLog=[];logAudit('مسح سجل النظام','الأمان','تم بدء سجل جديد');saveState();render();toast('تم مسح السجل')}
function downloadBackup(){logAudit('إنشاء نسخة احتياطية','النسخ الاحتياطي',`الإصدار ${APP_VERSION}`);saveState();const payload={app:'Orbit HR',version:APP_VERSION,createdAt:new Date().toISOString(),state},blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`orbit-hr-backup-${todayISO()}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('تم تحميل النسخة الاحتياطية')}
async function restoreBackupFile(input){const file=input.files?.[0];if(!file)return;if(file.size>25*1024*1024){input.value='';return toast('ملف النسخة أكبر من 25 ميجابايت','error')}try{const text=await file.text(),raw=JSON.parse(text),candidate=raw.state||raw;if(!candidate||!Array.isArray(candidate.employees)||!Array.isArray(candidate.users))throw new Error('الملف لا يحتوي بيانات نظام صحيحة');if(!confirm('سيتم استبدال كل البيانات الحالية بالنسخة المختارة. متابعة؟')){input.value='';return}state=normalizeState(candidate);logAudit('استرجاع نسخة احتياطية','النسخ الاحتياطي',file.name);saveState();const u=state.users.find(x=>x.id===currentUser?.id)||state.users.find(x=>x.email===currentUser?.email);if(u)saveSession({...u});else saveSession(null);saveView(currentView);render();toast('تم استرجاع النسخة بنجاح')}catch(e){toast(e?.message||'تعذر استرجاع النسخة','error')}finally{input.value=''}}

Object.assign(REPORT_TYPES,Object.fromEntries(Object.entries(EXTRA_MODULES).map(([route,cfg])=>[route,{label:cfg.label,icon:cfg.icon,desc:cfg.desc}])));
function moduleRecordsForReport(cfg,ctx){let list=[...state[cfg.stateKey]];if(cfg.employeeField)list=list.filter(x=>ctx.ids.includes(x[cfg.employeeField]));if(cfg.branchField&&ctx.branch)list=list.filter(x=>!x[cfg.branchField]||x[cfg.branchField]===ctx.branch);const df=cfg.dateField;if(df)list=list.filter(x=>{const v=String(x[df]||'');if(!v)return true;if(df==='period'||v.length===7)return v.startsWith(ctx.month);if(df==='updatedAt'||df==='lastSync')return v.startsWith(ctx.month);return v.slice(0,7)===ctx.month||((x.from||x.to)&&overlapsMonth(x.from,x.to,ctx.month))});return list}
function genericReportTable(route,list){const cfg=EXTRA_MODULES[route];return `<div class="table-wrap"><table class="table report-detail-table"><thead><tr>${cfg.columns.map(c=>`<th>${c.label}</th>`).join('')}</tr></thead><tbody>${list.map(r=>`<tr>${cfg.columns.map(c=>`<td>${moduleDisplayValue(cfg,r,c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`}
function renderGenericModuleReport(route,ctx){const cfg=EXTRA_MODULES[route],list=ctx.extra[route]||[],pending=list.filter(x=>x.status==='pending').length,approved=list.filter(x=>['approved','completed','paid','issued','sent','published','connected','resolved','hired','settled','closed'].includes(x.status)).length;let amount=list.reduce((s,x)=>s+Number(x.amount||x.settlementAmount||x.penaltyAmount||0),0),currencyEmployee=list.find(x=>x.employeeId)?.employeeId;const content=`<div class="grid grid-4">${metric(cfg.icon,list.length,'إجمالي السجلات',ctx.month)}${metric('⌛',pending,'قيد المراجعة','داخل الفلاتر')}${metric('✓',approved,'معتمد / مكتمل','داخل الفلاتر')}${metric('Σ',amount?moneyForEmployee(amount,currencyEmployee):'—','إجمالي مالي','إن وجد')}</div>${reportSection(cfg.label,list.length?genericReportTable(route,list):noReportData(`لا توجد بيانات في ${cfg.label}`))}`;return reportDocument(`تقرير ${cfg.label}`,ctx,content,cfg.desc)}
function genericModuleExportData(route,ctx){const cfg=EXTRA_MODULES[route],list=ctx.extra[route]||[];return {headers:cfg.columns.map(c=>c.label),rows:list.map(r=>cfg.columns.map(c=>modulePlainValue(cfg,r,c)))}}
function renderServicesReportSummary(ctx){const rows=Object.entries(EXTRA_MODULES).map(([route,cfg])=>{const list=ctx.extra[route]||[];return [cfg.icon+' '+cfg.label,list.length,list.filter(x=>x.status==='pending').length,list.filter(x=>['approved','completed','paid','issued','sent','published','connected','resolved','hired','settled','closed'].includes(x.status)).length]}).filter(x=>x[1]>0);return reportSection('ملخص الخدمات الإدارية',rows.length?`<div class="table-wrap"><table class="table compact-table"><thead><tr><th>الخدمة</th><th>إجمالي</th><th>معلق</th><th>منجز</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td></tr>`).join('')}</tbody></table></div>`:noReportData('لا توجد خدمات إدارية خلال الفترة'))}


/* ===== v3.5: PDF, bilingual interface, employee role assignment, multi-select ===== */
const UI_TRANSLATIONS={
'حذف رواتب المحدد':'Delete selected payrolls','لوحة التحكم':'Dashboard','مركز الخدمات':'Service Center','الموظفون':'Employees','العقود والمستندات':'Documents & Contracts','الحضور والانصراف':'Attendance','الإجازات':'Leaves','الورديات':'Shifts','المأموريات':'Missions','مصروفات الشركة':'Company Expenses','الخصومات والمكافآت':'Deductions & Rewards','العُهد':'Custody','الرواتب':'Payroll','التقارير':'Reports','سجل النظام':'Audit Log','الإعدادات':'Settings','الخدمات':'Services','كل الخدمات':'All Services','إضافة':'Add','تعديل':'Edit','حذف':'Delete','حفظ':'Save','إلغاء':'Cancel','إغلاق':'Close','عرض':'View','فتح':'Open','تحميل':'Download','اعتماد':'Approve','رفض':'Reject','قبول':'Accept','بحث':'Search','كل الفروع':'All branches','كل الأقسام':'All departments','كل الحالات':'All statuses','كل الموظفين':'All employees','نشط':'Active','غير نشط':'Inactive','الحالة':'Status','الفرع':'Branch','القسم':'Department','الموظف':'Employee','التاريخ':'Date','المبلغ':'Amount','العملة':'Currency','إجراءات':'Actions','الاسم':'Name','الكود':'Code','الوظيفة':'Job title','الراتب':'Salary','الحضور':'Attendance','الانصراف':'Check-out','وقت الدخول':'Check-in time','وقت الخروج':'Check-out time','قيد المراجعة':'Pending','معتمد':'Approved','مرفوض':'Rejected','تم الصرف':'Paid','مسودة':'Draft','تمت المراجعة':'Reviewed','مغلق':'Locked','اليوم':'Today','الشهر':'Month','السنة':'Year','من تاريخ':'From date','إلى تاريخ':'To date','نوع الإجازة':'Leave type','السبب':'Reason','طلب إجازة':'Leave request','طلب إجازة جديد':'New leave request','تعديل طلب الإجازة':'Edit leave request','إدارة الإجازات':'Leave Management','إدارة سجلات الحضور':'Attendance Records','دليل الموظفين':'Employee Directory','إجمالي الموظفين':'Total employees','الموظفون النشطون':'Active employees','الحاضرون اليوم':'Present today','حالات التأخير':'Late cases','طلبات معلقة':'Pending requests','إجمالي المصروفات':'Total expenses','إجمالي السجلات':'Total records','إجمالي الخصومات':'Total deductions','إجمالي الاستحقاقات':'Total earnings','صافي المستحق':'Net pay','اسم المصروف':'Expense name','فئة المصروف':'Expense category','العهدة المالية المرتبطة':'Linked financial custody','لوحة التحكم المركزية':'Central control panel','إعدادات النظام':'System Settings','المنشأة والهيكل':'Organization & Structure','الحضور والرواتب':'Attendance & Payroll','الإعدادات المالية':'Financial Settings','المستندات والعقود':'Documents & Contracts','الأدوار والصلاحيات':'Roles & Permissions','الإجازات والأرصدة':'Leave & Balances','النظام والنسخ الاحتياطي':'System & Backup','تصدير CSV':'Export CSV','تصدير PDF':'Export PDF','طباعة':'Print','تحديد الكل':'Select all','المحدد':'Selected','مسح التحديد':'Clear selection','لا توجد بيانات':'No data','لا توجد سجلات':'No records','بحث سريع في':'Quick search in','اكتب كلمة البحث...':'Type to search...','نتيجة':'result','جاهز للبحث':'Ready to search','العربية / English':'Arabic / English','أهلًا':'Welcome','عرض التقرير':'View report','عرض الكل':'View all','صافي رواتب الشهر':'Monthly net payroll','مصروفات الشهر المعتمدة':'Approved monthly expenses','أرصدة العهد المالية':'Financial custody balances','توزيع الموظفين حسب الفرع':'Employees by branch','توزيع الأقسام':'Departments distribution','حالة دورة الرواتب':'Payroll cycle status','تنبيهات الموارد البشرية':'HR alerts','حضور اليوم':'Today attendance','إرسال الطلب':'Submit request','حفظ التعديل':'Save changes','فئات المستندات':'Document categories','فئة جديدة':'New category','إنشاء دور وظيفي':'Create job role','اسم الدور الجديد':'New role name','صلاحيات مفعلة':'enabled permissions','تعديل الاسم':'Rename','مسؤول النظام':'System Administrator','مدير':'Manager','موظف':'Employee','موظف الموارد البشرية':'HR Officer','موظف المالية':'Finance Officer','إسناد الصلاحيات لموظف':'Assign permissions to employee','اختر الموظف':'Select employee','الدور / الصلاحية':'Role / permission','حالة حساب الدخول':'Login account status','حفظ صلاحية الموظف':'Save employee permission','الموظفون والصلاحيات الحالية':'Employees and current permissions','اختيار سريع للموظف وتعديل دوره من نفس الصفحة':'Quickly select an employee and change the role from this page','الدور الحالي':'Current role','الحساب':'Account','اختيار':'Select','بحث باسم الموظف أو الفرع أو الدور':'Search by employee, branch, or role','بدون حساب':'No account','مفعّل':'Enabled','موقوف':'Disabled','تعيين لموظف':'Assign to employee','تعديل حالة':'Change status','مسح التاريخ':'Clear dates','أدوات':'Tools','الرواتب حسب الفروع':'Payroll by branch','تشغيل مرتبات فرع':'Run branch payroll','اختر الفرع':'Select branch','احتساب رواتب الفرع':'Calculate branch payroll','كل فرع مستقل':'Each branch separately','الحالة الجديدة':'New status','الحالة الحالية':'Current status','اختر السجل':'Select record'
};
function translateString(value){let out=String(value??'');if(!out.trim())return out;const exact=UI_TRANSLATIONS[out.trim()];if(exact)return out.replace(out.trim(),exact);for(const [ar,en] of Object.entries(UI_TRANSLATIONS).sort((a,b)=>b[0].length-a[0].length))out=out.replaceAll(ar,en);return out}
function applyLanguage(root=document){const en=state?.settings?.language==='en';document.documentElement.lang=en?'en':'ar';document.documentElement.dir=en?'ltr':'rtl';document.body.classList.toggle('lang-en',en);if(!en)return;const scope=root instanceof Element?root:document.body,walker=document.createTreeWalker(scope,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.parentElement&&!['SCRIPT','STYLE','TEXTAREA'].includes(n.parentElement.tagName)&&n.nodeValue.trim()?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT}),nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);nodes.forEach(n=>n.nodeValue=translateString(n.nodeValue));scope.querySelectorAll?.('[placeholder],[title],[aria-label]').forEach(el=>['placeholder','title','aria-label'].forEach(a=>{if(el.hasAttribute(a))el.setAttribute(a,translateString(el.getAttribute(a)))}))}
function toggleLanguage(){state.settings.language=state.settings.language==='en'?'ar':'en';saveState();render();toast(state.settings.language==='en'?'English interface enabled':'تم تفعيل الواجهة العربية')}
function exportCurrentSectionPDF(){document.body.classList.add('printing-section');const old=document.title;document.title=`Orbit-HR-${currentView}-${todayISO()}`;window.print();setTimeout(()=>{document.body.classList.remove('printing-section');document.title=old},500)}
function recordIdFromRow(row){
  if(!row)return '';
  if(row.dataset.recordId)return row.dataset.recordId;
  if(row.dataset.id)return row.dataset.id;
  if(row.id?.startsWith('custody-row-'))return row.id.replace('custody-row-','');
  const calls=[...row.querySelectorAll('[onclick]')].map(el=>el.getAttribute('onclick')||'').join(';');
  const patterns=[
    /(?:viewEmployee|employeeModal|deleteEmployee)\('([^']+)'\)/,
    /(?:viewAttendance|editAttendanceModal|deleteAttendance|showAttendanceLocation)\('([^']+)'/,
    /(?:leaveModal|viewExpense|expenseModal|expenseStatus|deleteExpense|adjustmentStatus|adjustmentModal|deleteAdjustment|custodyModal|showCustodyExpenses|settleFinancialCustody|closeCustody|deleteCustody|showPayslip|setPayrollStatus|viewDocument|documentModal|deleteDocument)\('([^']+)'/,
    /(?:setRequestStatus|deleteRequest|requestStatusModal)\('[^']+','([^']+)'/,
    /(?:viewModuleRecord|moduleModal|setModuleStatus|deleteModuleRecord)\('[^']+','([^']+)'/
  ];
  for(const re of patterns){const m=calls.match(re);if(m?.[1])return m[1]}
  return ''
}
function statusBulkLabel(status,label=''){
  return ({
    active:'تفعيل المحدد',inactive:'إيقاف المحدد',present:'تسجيل المحدد حاضر',late:'تسجيل المحدد متأخر',absent:'تسجيل المحدد غائب',
    pending:'إرجاع المحدد للمراجعة',reviewed:'مراجعة المحدد',approved:'اعتماد المحدد',rejected:'رفض المحدد',
    paid:'صرف المحدد',locked:'إغلاق المحدد',assigned:'إعادة فتح المحدد',returned:'تسوية / رد المحدد',
    damaged:'تسجيل المحدد تالف',lost:'تسجيل المحدد مفقود',completed:'إكمال المحدد',closed:'إغلاق المحدد',
    issued:'إصدار المحدد',sent:'إرسال المحدد',published:'نشر المحدد',resolved:'حل المحدد',hired:'تعيين المحدد',settled:'تسوية المحدد'
  })[status]||`${label||statusText(status)} للمحدد`
}
function bulkStatusButtonClass(status){return ['approved','paid','completed','issued','sent','published','resolved','hired','settled','returned'].includes(status)?'btn-success':['rejected','damaged','lost'].includes(status)?'btn-danger':'btn-secondary'}
function bulkActionDefinitions(route=currentView){
  const actions=[],addStatus=(status,label='')=>actions.push({type:'status',status,label:statusBulkLabel(status,label),className:bulkStatusButtonClass(status)}),addDelete=(label='حذف المحدد')=>actions.push({type:'delete',label,className:'btn-danger'}),addExportPDF=(label='تصدير رواتب المحدد PDF')=>actions.push({type:'export-payroll-pdf',label,className:'btn-primary'});
  if(route==='employees'){
    if(canAdmin()){addStatus('active','نشط');addStatus('inactive','غير نشط');addDelete()}
  }else if(route==='documents'){
    if(canManage())addDelete()
  }else if(route==='attendance'){
    if(canManage()){addStatus('present','حاضر');addStatus('late','متأخر');addStatus('absent','غائب');addDelete()}
  }else if(route==='leaves'||route==='missions'){
    if(canManage()){addStatus('reviewed','تمت المراجعة');addStatus('approved','معتمد');addStatus('rejected','مرفوض')}
    if(canAdmin())addDelete();else if(currentUser.role==='employee')addDelete('إلغاء المحدد')
  }else if(route==='expenses'){
    if(canManage()){addStatus('reviewed','تمت المراجعة');addStatus('approved','معتمد');addStatus('rejected','مرفوض');addDelete()}
  }else if(route==='adjustments'){
    if(canManage()){addStatus('reviewed','تمت المراجعة');addStatus('approved','معتمد');addStatus('rejected','مرفوض')}
    if(canAdmin())addDelete()
  }else if(route==='custody'){
    if(canManage()){addStatus('assigned','مفتوحة');addStatus('returned','تمت التسوية / الرد')}
    if(canAdmin())addDelete()
  }else if(route==='payroll'){
    if(canOperatePayroll()){addExportPDF();addStatus('draft','مسودة');addStatus('reviewed','تمت المراجعة');addStatus('approved','معتمد');addStatus('paid','تم الصرف');addStatus('locked','مغلق');addDelete('حذف رواتب المحدد')}
  }else if(EXTRA_MODULES[route]){
    const cfg=EXTRA_MODULES[route];
    if(moduleCanManage(cfg))(cfg.statuses||[]).forEach(([status,label])=>addStatus(status,label));
    if(canAdmin())addDelete()
  }
  return actions
}
function enhanceTablesWithSelection(){
  const scope=$('#sectionSearchScope');if(!scope)return;
  const actions=bulkActionDefinitions();
  if(!actions.length){$('#bulkSelectionBar')?.remove();return}
  scope.querySelectorAll('table').forEach(table=>{
    if(table.dataset.selectionReady==='1'||table.classList.contains('no-select-table'))return;
    const nativeChecks=[...table.querySelectorAll('tbody .att-row-check')];
    if(nativeChecks.length){
      table.dataset.selectionReady='1';nativeChecks.forEach(cb=>cb.addEventListener('change',updateBulkSelection));
      const master=table.querySelector('thead input[aria-label="تحديد الكل"]');if(master)master.addEventListener('change',()=>setTimeout(updateBulkSelection,0));
      nativeChecks.forEach(cb=>{const row=cb.closest('tr'),id=recordIdFromRow(row);if(id)row.dataset.recordId=id});return
    }
    const rows=[...table.querySelectorAll('tbody tr')].filter(r=>r.children.length>1&&!r.querySelector('.empty')).map(r=>({row:r,id:recordIdFromRow(r)})).filter(x=>x.id);
    if(!rows.length)return;
    table.dataset.selectionReady='1';
    const head=table.querySelector('thead tr');if(head){const th=document.createElement('th');th.className='selection-col no-print';th.innerHTML='<input type="checkbox" aria-label="تحديد الكل" onchange="toggleTableSelection(this)">';head.prepend(th)}
    rows.forEach(({row,id})=>{row.dataset.recordId=id;const td=document.createElement('td');td.className='selection-col no-print';td.innerHTML='<input type="checkbox" class="row-select" aria-label="تحديد السجل" onchange="updateBulkSelection()">';row.prepend(td)})
  });updateBulkSelection()
}
function toggleTableSelection(master){master.closest('table')?.querySelectorAll('tbody .row-select,tbody .att-row-check').forEach(cb=>{const row=cb.closest('tr');if(row.style.display!=='none'&&!row.classList.contains('section-search-hidden')&&!row.classList.contains('v37-filter-hidden'))cb.checked=master.checked});updateBulkSelection()}
function selectedRows(){return [...document.querySelectorAll('#sectionSearchScope tbody .row-select:checked,#sectionSearchScope tbody .att-row-check:checked')].map(x=>x.closest('tr'))}
function selectedRecordIds(){return [...new Set(selectedRows().map(recordIdFromRow).filter(Boolean))]}
function updateBulkSelection(){
  const rows=selectedRows(),old=$('#bulkSelectionBar'),actions=bulkActionDefinitions();
  if(!rows.length||!actions.length){old?.remove();return}
  const bar=old||document.createElement('div');bar.id='bulkSelectionBar';bar.className='bulk-selection-bar no-print';
  const buttons=actions.map(a=>a.type==='status'?`<button class="btn ${a.className} btn-sm" type="button" onclick="bulkSetSelectedStatus('${a.status}')">${escapeHTML(a.label)}</button>`:a.type==='export-payroll-pdf'?`<button class="btn ${a.className} btn-sm" type="button" onclick="exportSelectedPayrollPDF()">▤ ${escapeHTML(a.label)}</button>`:`<button class="btn ${a.className} btn-sm" type="button" onclick="bulkDeleteSelected()">${escapeHTML(a.label)}</button>`).join('');
  bar.innerHTML=`<strong>${selectedRecordIds().length||rows.length} محدد</strong><div class="bulk-selection-actions">${buttons}<button class="btn btn-secondary btn-sm" type="button" onclick="clearSelections()">مسح التحديد</button></div>`;
  if(!old)document.body.appendChild(bar);applyLanguage(bar)
}
function clearSelections(){document.querySelectorAll('.row-select,.att-row-check,input[aria-label="تحديد الكل"]').forEach(x=>x.checked=false);updateBulkSelection()}
function bulkRecordConfig(route=currentView){if(route==='documents')return null;return sectionStatusConfig(route)}
function bulkSetSelectedStatus(status){
  const ids=selectedRecordIds(),cfg=bulkRecordConfig();if(!ids.length||!cfg)return toast('لا توجد سجلات محددة','error');
  const action=statusBulkLabel(status).replace(' المحدد','');if(!confirm(`${action} لعدد ${ids.length} سجل؟`))return;
  let changed=0,skipped=0;
  ids.forEach(id=>{
    const record=(state[cfg.stateKey]||[]).find(r=>r.id===id);if(!record){skipped++;return}
    if(cfg.stateKey==='employees'&&record.id===currentUser?.employeeId&&status==='inactive'){skipped++;return}
    if(cfg.stateKey==='expenses'&&status==='approved'&&record.custodyId&&!validateExpenseCustody({...record},record.id)){skipped++;return}
    if(cfg.stateKey==='custodies'){
      if(['damaged','lost'].includes(status)&&record.custodyType==='financial'){skipped++;return}
      if(status==='returned'&&record.custodyType==='financial'){
        if(custodyPendingSpent(record)>0){skipped++;return}
        const remaining=custodyRemaining(record);record.returnedCash=Number(record.returnedCash||0)+remaining;record.returnDate=record.returnDate||todayISO()
      }else if(status!=='assigned'&&!record.returnDate)record.returnDate=todayISO()
      if(status==='assigned'){record.returnDate='';if(record.custodyType==='financial')record.returnedCash=0}
    }
    const old=record.status||'';record.status=status;record.updatedAt=new Date().toISOString();record.statusUpdatedAt=record.updatedAt;record.statusUpdatedBy=currentUser.id;
    if(cfg.stateKey==='attendance'&&status==='absent'){record.checkIn=null;record.checkOut=null;record.lateMinutes=0;record.overtimeMinutes=0}
    if(EXTRA_MODULES[currentView]){
      applyModuleSideEffects(currentView,record);
      if(currentView==='advances'){
        if(status==='approved'){record.approvedBy=currentUser.id;record.approvedAt=record.statusUpdatedAt}
        if(status==='paid'){record.disbursedBy=currentUser.id;record.disbursedAt=record.statusUpdatedAt}
        if(status==='rejected')record.rejectedAt=record.statusUpdatedAt
      }
    }
    logAudit('تعديل جماعي للحالة',cfg.label,`${id}: ${statusText(old)} ← ${statusText(status)}`);changed++
  });
  if(!changed)return toast(skipped?'تعذر تطبيق الإجراء على السجلات المحددة':'لم يتم إجراء أي تعديل','error');
  saveState();render();toast(`تم تحديث ${changed} سجل${skipped?`، وتعذر تحديث ${skipped}`:''}`)
}
function bulkDeleteSelected(){
  const ids=selectedRecordIds();if(!ids.length)return toast('لا توجد سجلات محددة','error');
  if(!confirm(`حذف ${ids.length} سجل محدد؟ لا يمكن التراجع عن الحذف.`))return;
  let deleted=0,skipped=0;
  if(currentView==='employees'){
    const allowed=ids.filter(id=>id!==currentUser?.employeeId);skipped+=ids.length-allowed.length;
    state.employees=state.employees.filter(x=>!allowed.includes(x.id));state.users=state.users.filter(x=>!allowed.includes(x.employeeId));state.documents=state.documents.filter(x=>!allowed.includes(x.employeeId));deleted=allowed.length
  }else if(currentView==='documents'){const before=state.documents.length;state.documents=state.documents.filter(x=>!ids.includes(x.id));deleted=before-state.documents.length
  }else if(currentView==='attendance'){const before=state.attendance.length;state.attendance=state.attendance.filter(x=>!ids.includes(x.id));deleted=before-state.attendance.length
  }else if(currentView==='leaves'||currentView==='missions'){
    const key=currentView,allowed=currentUser.role==='employee'?ids.filter(id=>{const r=state[key].find(x=>x.id===id);return r?.employeeId===currentUser.employeeId&&r.status==='pending'}):ids;
    skipped+=ids.length-allowed.length;const before=state[key].length;state[key]=state[key].filter(x=>!allowed.includes(x.id));deleted=before-state[key].length
  }else if(currentView==='expenses'){const before=state.expenses.length;state.expenses=state.expenses.filter(x=>!ids.includes(x.id));deleted=before-state.expenses.length
  }else if(currentView==='adjustments'){const before=state.adjustments.length;state.adjustments=state.adjustments.filter(x=>!ids.includes(x.id));deleted=before-state.adjustments.length
  }else if(currentView==='custody'){
    const allowed=ids.filter(id=>!linkedCustodyExpenses(id,['approved','pending','rejected']).length);skipped+=ids.length-allowed.length;const before=state.custodies.length;state.custodies=state.custodies.filter(x=>!allowed.includes(x.id));deleted=before-state.custodies.length
  }else if(currentView==='payroll'){
    const allowed=ids.filter(id=>{const r=state.payroll.find(x=>x.id===id);return r&&!['paid','locked'].includes(r.status)});skipped+=ids.length-allowed.length;const before=state.payroll.length;state.payroll=state.payroll.filter(x=>!allowed.includes(x.id));deleted=before-state.payroll.length
  }else if(EXTRA_MODULES[currentView]){
    const cfg=EXTRA_MODULES[currentView],allowed=[...ids];
    if(currentView==='complaints')state.complaints.filter(x=>allowed.includes(x.id)&&x.linkedAdjustmentId).forEach(x=>state.adjustments=state.adjustments.filter(a=>a.id!==x.linkedAdjustmentId));
    const before=state[cfg.stateKey].length;state[cfg.stateKey]=state[cfg.stateKey].filter(x=>!allowed.includes(x.id));deleted=before-state[cfg.stateKey].length
  }
  if(!deleted)return toast(skipped?(currentView==='payroll'?'لا يمكن حذف الرواتب المصروفة أو المغلقة':'تعذر حذف السجلات المحددة لوجود قيود مرتبطة بها'):'لا يتوفر حذف جماعي في هذا القسم','error');
  logAudit('حذف جماعي',sectionSearchLabel(),`${deleted} سجل`);saveState();render();toast(`تم حذف ${deleted} سجل${skipped?(currentView==='payroll'?`، وتم تجاهل ${skipped} راتب مصروف أو مغلق`:`، وتعذر حذف ${skipped}`):''}`)
}
const languageObserver=new MutationObserver(ms=>{if(state?.settings?.language==='en')ms.forEach(m=>m.addedNodes.forEach(n=>{if(n.nodeType===1)applyLanguage(n)}))});languageObserver.observe(document.documentElement,{childList:true,subtree:true});



/* ===== v3.6: corrected inline filters, report exports, flexible statuses, employee advances ===== */
if(!NAV.some(n=>n[0]==='advances')){
  const insertAt=Math.max(0,NAV.findIndex(n=>n[0]==='adjustments')+1);
  NAV.splice(insertAt,0,['advances','💰','سلف الموظفين',['admin','manager','employee']]);
}
Object.assign(UI_TRANSLATIONS,{
  'سلف الموظفين':'Employee Advances','طلب سلفة':'Advance request','قيمة السلفة':'Advance amount','عدد الأقساط':'Installments','بداية الخصم':'Deduction start','قسط السلفة':'Advance installment','تصدير Excel':'Export Excel','فلترة النتائج':'Filter results','بحث بالاسم أو البيان':'Search name or description','تغيير حالة الطلب':'Change request status','ربط مالي':'Finance integration','تاريخ الطلب':'Request date'
});
if(EXTRA_MODULES.advances){
  EXTRA_MODULES.advances.label='سلف الموظفين';
  EXTRA_MODULES.advances.desc='الموظف يقدم طلب سلفة، والمالية تراجعه وتعتمده أو ترفضه، وبعد الصرف تُخصم الأقساط تلقائيًا من الرواتب.';
  EXTRA_MODULES.advances.statuses=[['pending','قيد المراجعة'],['reviewed','تمت المراجعة'],['approved','معتمد'],['paid','تم الصرف'],['rejected','مرفوض'],['closed','مغلق']];
  EXTRA_MODULES.advances.branchField='branch';
  if(!EXTRA_MODULES.advances.columns.some(c=>c.field==='branch'))EXTRA_MODULES.advances.columns.splice(1,0,{field:'branch',label:'الفرع',type:'branchDerived'});
  if(!EXTRA_MODULES.advances.columns.some(c=>c.field==='installmentAmount'))EXTRA_MODULES.advances.columns.splice(5,0,{field:'installmentAmount',label:'قيمة القسط',type:'moneyEmployee'});
}

renderView=function(){
  const fixed={dashboard:renderDashboard,services:renderServicesHub,organization:renderOrganization,approvals:renderApprovalCenter,selfservice:renderSelfService,employees:renderEmployees,documents:renderDocuments,attendance:renderAttendance,leaves:renderLeaves,shifts:renderShifts,missions:renderMissions,expenses:renderExpenses,adjustments:renderAdjustments,custody:renderCustody,payroll:renderPayroll,reports:renderReports,audit:renderAuditLog,settings:renderSettings};
  const body=EXTRA_MODULES[currentView]?renderGenericModule(currentView):(fixed[currentView]||renderDashboard)();
  return `<div id="sectionSearchScope" data-section-route="${escapeHTML(currentView)}">${body}</div>`;
};

function sectionInlineStatusOptions(){const cfg=sectionStatusConfig();return cfg?.statuses||[]}
function inlineFilterBarHTML(){
  const statuses=sectionInlineStatusOptions();
  return `<section class="inline-section-filters no-print" id="inlineSectionFilters"><div class="inline-filter-title"><span>⌕</span><div><strong>فلترة النتائج</strong><small>البحث والتاريخ والتصدير من نفس القسم</small></div></div><div class="inline-filter-controls"><input class="input" id="sectionGlobalSearch" placeholder="بحث بالاسم أو البيان" oninput="applyInlineSectionFilters()"><div class="inline-date-field"><label>من تاريخ</label><input class="input" id="sectionDateFrom" type="date" onchange="applyInlineSectionFilters()"></div><div class="inline-date-field"><label>إلى تاريخ</label><input class="input" id="sectionDateTo" type="date" onchange="applyInlineSectionFilters()"></div>${statuses.length?`<select class="select" id="sectionStatusFilter" onchange="applyInlineSectionFilters()"><option value="">كل الحالات</option>${statuses.map(([v,l])=>`<option value="${escapeHTML(v)}">${escapeHTML(l)}</option>`).join('')}</select>`:''}<button class="btn btn-secondary" onclick="clearInlineSectionFilters()">مسح الفلاتر</button><button class="btn btn-success" onclick="exportVisibleSectionExcel()">▣ تصدير Excel</button><button class="btn btn-primary" onclick="exportVisibleSectionPDF()">▤ تصدير PDF</button><span class="result-counter"><b id="sectionSearchCount">—</b> سجل</span></div></section>`;
}
function installInlineSectionFilters(){
  const scope=$('#sectionSearchScope');if(!scope)return;
  // Attendance already contains the correct integrated employee/date/status/branch filters.
  if(currentView==='attendance')return;
  if(EXTRA_MODULES[currentView]){
    const toolbar=scope.querySelector('.toolbar');if(!toolbar)return;
    if(!toolbar.querySelector('#moduleFrom')){
      const wrap=document.createElement('div');wrap.className='module-date-pair';wrap.innerHTML=`<div class="inline-date-field"><label>من تاريخ</label><input class="input" id="moduleFrom" type="date" onchange="filterModuleRows('${currentView}')"></div><div class="inline-date-field"><label>إلى تاريخ</label><input class="input" id="moduleTo" type="date" onchange="filterModuleRows('${currentView}')"></div>`;
      toolbar.appendChild(wrap);
    }
    const old=[...toolbar.querySelectorAll('button')].find(b=>/تصدير CSV|Export CSV/.test(b.textContent));
    if(old){old.textContent='▣ تصدير Excel';old.setAttribute('onclick','exportVisibleSectionExcel()');old.className='btn btn-success'}
    if(!toolbar.querySelector('.module-pdf-export')){const b=document.createElement('button');b.className='btn btn-primary module-pdf-export';b.textContent='▤ تصدير PDF';b.setAttribute('onclick','exportVisibleSectionPDF()');toolbar.appendChild(b)}
    applyLanguage(toolbar);filterModuleRows(currentView);return;
  }
  if(scope.querySelector('#inlineSectionFilters'))return;
  const head=scope.querySelector('.page-head,.attendance-banner,.settings-hero');
  const holder=document.createElement('div');holder.innerHTML=inlineFilterBarHTML();const bar=holder.firstElementChild;
  if(head)head.insertAdjacentElement('afterend',bar);else scope.prepend(bar);
  applyLanguage(bar);applyInlineSectionFilters();
}
function inlineFilterTargets(){const scope=$('#sectionSearchScope');if(!scope)return [];const rows=[...scope.querySelectorAll('table tbody tr')].filter(r=>r.children.length>1);if(rows.length)return rows;return currentSectionSearchTargets()}
function targetStatus(el){return el.dataset.status||el.querySelector('.badge')?.textContent||''}
function applyInlineSectionFilters(){
  if(currentView==='attendance'){filterAttendanceRows();return}
  if(EXTRA_MODULES[currentView]){filterModuleRows(currentView);return}
  const q=normalizeSearchText($('#sectionGlobalSearch')?.value||''),from=$('#sectionDateFrom')?.value||'',to=$('#sectionDateTo')?.value||'',st=$('#sectionStatusFilter')?.value||'',targets=inlineFilterTargets();let shown=0;
  targets.forEach(el=>{const text=normalizeSearchText(`${el.dataset.search||''} ${el.textContent||''}`),matchesStatus=!st||el.dataset.status===st||normalizeSearchText(targetStatus(el)).includes(normalizeSearchText(statusText(st))),show=(!q||text.includes(q))&&elementMatchesDateRange(el,from,to)&&matchesStatus;el.classList.toggle('section-search-hidden',!show);if(show)shown++});
  if(currentView==='custody')syncCustodyBranchVisibility();if(currentView==='payroll')syncPayrollBranchVisibility();const c=$('#sectionSearchCount');if(c)c.textContent=shown;
}
function clearInlineSectionFilters(){['sectionGlobalSearch','sectionDateFrom','sectionDateTo','sectionStatusFilter'].forEach(id=>{const el=$('#'+id);if(el)el.value=''});applyInlineSectionFilters()}
function visibleTableData(){
  const scope=$('#sectionSearchScope'),tables=[...scope.querySelectorAll('table')],sections=[];
  tables.forEach((table,index)=>{const headers=[...table.querySelectorAll('thead th')].map(th=>th.textContent.trim()).filter(h=>h&&!/إجراءات|Actions|تحديد/.test(h));const rows=[...table.querySelectorAll('tbody tr')].filter(r=>r.style.display!=='none'&&!r.classList.contains('section-search-hidden')).map(r=>[...r.querySelectorAll('td')].filter(td=>!td.classList.contains('selection-col')&&!td.classList.contains('check-col')&&!td.querySelector('.actions,.att-row-actions')).map(td=>td.innerText.replace(/\s+/g,' ').trim()));if(headers.length&&rows.length)sections.push({title:`${sectionSearchLabel()} ${index+1}`,headers,rows})});
  return sections;
}
function exportVisibleSectionExcel(){
  if(currentView==='attendance'){exportAttendance();return}
  const sections=visibleTableData();if(!sections.length)return toast('لا توجد بيانات ظاهرة للتصدير','error');const headers=['القسم',...sections.reduce((a,s)=>s.headers.length>a.length?s.headers:a,[])],rows=[];sections.forEach(s=>s.rows.forEach(r=>rows.push([s.title,...r])));downloadCSV(`orbit-${currentView}-${todayISO()}.csv`,headers,rows);toast('تم تجهيز ملف Excel بالسجلات الظاهرة')
}
function exportVisibleSectionPDF(){
  const sections=visibleTableData();if(!sections.length&&currentView!=='dashboard'&&currentView!=='settings')return toast('لا توجد بيانات ظاهرة للطباعة','error');document.body.classList.add('printing-section');const old=document.title;document.title=`Orbit-${sectionSearchLabel()}-${todayISO()}`;window.print();setTimeout(()=>{document.body.classList.remove('printing-section');document.title=old},500)
}


function selectedPayrollRecords(){
  const ids=selectedRecordIds();
  return ids.map(id=>state.payroll.find(p=>p.id===id)).filter(Boolean);
}
function payrollSelectedReportHTML(list){
  const groups=[...new Set(list.map(p=>emp(p.employeeId)?.branch||'بدون فرع'))].map(branch=>({branch,rows:list.filter(p=>(emp(p.employeeId)?.branch||'بدون فرع')===branch)}));
  const exportedAt=new Intl.DateTimeFormat(currentLocale(),{year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date());
  return `<section id="payrollSelectedPrintReport" class="payroll-selected-print-report"><header class="payroll-print-header"><img src="orbit-logo-ui.png" alt="شعار أوربت"><div><h1>${escapeHTML(state.settings.company||APP_NAME)}</h1><h2>تقرير رواتب الموظفين المحددين</h2><p>تاريخ التصدير: ${escapeHTML(exportedAt)} · عدد السجلات: ${list.length}</p></div></header>${groups.map(g=>{const currency=getBranchCurrency(g.branch),net=g.rows.reduce((s,p)=>s+Number(p.net||0),0),gross=g.rows.reduce((s,p)=>s+Number(p.gross||0),0),deductions=g.rows.reduce((s,p)=>s+Number(p.deductions||0),0);return `<article class="payroll-print-branch"><div class="payroll-print-branch-head"><div><strong>${escapeHTML(g.branch)}</strong><span>${g.rows.length} موظف</span></div><div><span>الاستحقاقات: <b>${money(gross,currency)}</b></span><span>الخصومات: <b>${money(deductions,currency)}</b></span><span>الصافي: <b>${money(net,currency)}</b></span></div></div>${payrollReportTable(g.rows)}</article>`}).join('')}</section>`;
}
function exportSelectedPayrollPDF(){
  if(currentView!=='payroll')return toast('هذا التصدير متاح داخل قسم الرواتب فقط','error');
  const list=selectedPayrollRecords();if(!list.length)return toast('حدد موظفًا واحدًا على الأقل من جدول الرواتب','error');
  $('#payrollSelectedPrintReport')?.remove();$('#sectionSearchScope')?.insertAdjacentHTML('beforeend',payrollSelectedReportHTML(list));
  const oldTitle=document.title;document.title=`Orbit-Payroll-Selected-${todayISO()}`;document.body.classList.add('printing-payroll-selected');
  setTimeout(()=>{window.print();document.body.classList.remove('printing-payroll-selected');$('#payrollSelectedPrintReport')?.remove();document.title=oldTitle},60);
}

// Request table with a flexible status editor next to every leave/mission request.
requestTable=function(list,type){
  const isLeave=type==='leave'; if(!list.length)return `<div class="empty"><span class="emoji">☂</span>لا توجد طلبات</div>`;
  return `<div class="table-wrap"><table class="table"><thead><tr><th>الموظف</th><th>${isLeave?'النوع':'العنوان'}</th><th>${isLeave?'الفترة':'التاريخ'}</th><th>${isLeave?'الأيام':'الموقع'}</th><th>التفاصيل</th>${isLeave?'<th>المعاملة المالية</th>':''}<th>الحالة</th><th>إجراءات</th></tr></thead><tbody>${list.map(r=>`<tr data-date="${escapeHTML(isLeave?r.from:r.date)}" data-from="${escapeHTML(isLeave?r.from:r.date)}" data-to="${escapeHTML(isLeave?r.to:r.date)}" data-status="${escapeHTML(r.status||'')}"><td>${escapeHTML(emp(r.employeeId)?.name||'-')}</td><td>${escapeHTML(isLeave?r.type:r.title)}</td><td>${isLeave?`${fmtDate(r.from)} — ${fmtDate(r.to)}`:fmtDate(r.date)}</td><td>${escapeHTML(isLeave?r.days:r.location)}</td><td>${escapeHTML(isLeave?r.reason:r.notes||'-')}</td>${isLeave?`<td><span class="badge badge-${r.paid===false?'danger':'success'}">${r.paid===false?'بدون راتب':'مدفوعة'}</span></td>`:''}<td>${statusBadge(r.status)}</td><td><div class="actions">${isLeave&&(canManage()||(r.employeeId===currentUser.employeeId&&r.status==='pending'))?`<button class="btn btn-secondary btn-sm" onclick="leaveModal('${r.id}')">تعديل</button>`:''}${canManage()?`<button class="btn btn-secondary btn-sm" onclick="requestStatusModal('${type}','${r.id}')">تغيير الحالة</button>`:''}${canManage()&&r.status==='pending'?`<button class="btn btn-success btn-sm" onclick="setRequestStatus('${type}','${r.id}','approved')">اعتماد</button><button class="btn btn-danger btn-sm" onclick="setRequestStatus('${type}','${r.id}','rejected')">رفض</button>`:''}${r.employeeId===currentUser.employeeId&&r.status==='pending'?`<button class="btn btn-danger btn-sm" onclick="deleteRequest('${type}','${r.id}')">إلغاء</button>`:''}</div></td></tr>`).join('')}</tbody></table></div>`;
};
function requestStatusModal(type,id){const arr=type==='leave'?state.leaves:state.missions,r=arr.find(x=>x.id===id);if(!r)return;openModal('تغيير حالة الطلب',`<form id="requestStatusForm" class="form-grid"><div class="field full"><label>الطلب</label><div class="input readonly-input">${escapeHTML(emp(r.employeeId)?.name||'-')} — ${escapeHTML(type==='leave'?r.type:r.title||'')}</div></div><div class="field"><label>الحالة الحالية</label><div class="input readonly-input">${escapeHTML(statusText(r.status))}</div></div><div class="field"><label>الحالة الجديدة</label><select class="select" name="status"><option value="pending" ${r.status==='pending'?'selected':''}>قيد المراجعة</option><option value="reviewed" ${r.status==='reviewed'?'selected':''}>تمت المراجعة</option><option value="approved" ${r.status==='approved'?'selected':''}>معتمد</option><option value="rejected" ${r.status==='rejected'?'selected':''}>مرفوض</option></select></div><div class="field full"><label>ملاحظة التغيير</label><textarea class="textarea" name="statusNote" rows="3">${escapeHTML(r.statusNote||'')}</textarea></div></form>`,()=>saveRequestFlexibleStatus(type,id),'حفظ الحالة')}
function saveRequestFlexibleStatus(type,id){const arr=type==='leave'?state.leaves:state.missions,r=arr.find(x=>x.id===id),form=$('#requestStatusForm');if(!r||!form)return;const old=r.status;r.status=form.elements.status.value;r.statusNote=form.elements.statusNote.value.trim();r.updatedAt=new Date().toISOString();r.statusUpdatedBy=currentUser.id;logAudit('تغيير حالة طلب',type==='leave'?'الإجازات':'المأموريات',`${emp(r.employeeId)?.name||'-'} — ${statusText(old)} ← ${statusText(r.status)}`);saveState();closeModal();render();toast('تم تعديل حالة الطلب')}
setRequestStatus=function(type,id,status){const arr=type==='leave'?state.leaves:state.missions;const x=arr.find(x=>x.id===id);if(!x)return;x.status=status;x.updatedAt=new Date().toISOString();x.statusUpdatedBy=currentUser.id;logAudit('تغيير حالة طلب',type==='leave'?'الإجازات':'المأموريات',`${emp(x.employeeId)?.name||'-'} — ${statusText(status)}`);saveState();render();toast(status==='approved'?'تم اعتماد الطلب':'تم رفض الطلب')};

// Generic modules: date-aware filtering, flexible finance status, and visible-row exports.
moduleTableRow=function(route,cfg,r){
  if(route==='advances'){r.branch=emp(r.employeeId)?.branch||'';r.installmentAmount=Number(r.installments||0)>0?Number(r.amount||0)/Number(r.installments):Number(r.amount||0)}
  const search=cfg.columns.map(c=>modulePlainValue(cfg,r,c)).join(' ').toLowerCase(),branch=cfg.branchField?r[cfg.branchField]||'':(route==='advances'?r.branch||'':''),date=String(r[cfg.dateField||'date']||r.date||r.createdAt||'').slice(0,10);
  return `<tr data-search="${escapeHTML(search)}" data-date="${escapeHTML(date)}" data-status="${escapeHTML(r.status||'')}" data-branch="${escapeHTML(branch)}">${cfg.columns.map(c=>`<td>${moduleDisplayValue(cfg,r,c)}</td>`).join('')}<td><div class="actions"><button class="btn btn-secondary btn-sm" onclick="viewModuleRecord('${route}','${r.id}')">عرض</button>${moduleCanManage(cfg)?`<button class="btn btn-secondary btn-sm" onclick="moduleModal('${route}','${r.id}')">تعديل</button>${r.status==='pending'?`<button class="btn btn-success btn-sm" onclick="setModuleStatus('${route}','${r.id}','approved')">اعتماد</button><button class="btn btn-danger btn-sm" onclick="setModuleStatus('${route}','${r.id}','rejected')">رفض</button>`:''}${route==='advances'&&r.status==='approved'?`<button class="btn btn-success btn-sm" onclick="setModuleStatus('advances','${r.id}','paid')">تأكيد الصرف</button>`:''}${cfg.specialAction==='syncDevice'?`<button class="btn btn-success btn-sm" onclick="syncBiometricDevice('${r.id}')">مزامنة</button>`:''}`:''}${canAdmin()?`<button class="btn btn-danger btn-sm" onclick="deleteModuleRecord('${route}','${r.id}')">حذف</button>`:''}</div></td></tr>`;
};
const moduleDisplayValueV35=moduleDisplayValue;
moduleDisplayValue=function(cfg,r,c){if(c.type==='branchDerived')return escapeHTML(emp(r.employeeId)?.branch||'-');return moduleDisplayValueV35(cfg,r,c)};
filterModuleRows=function(){const q=normalizeSearchText($('#moduleSearch')?.value||''),status=$('#moduleStatus')?.value||'',branch=$('#moduleBranch')?.value||'',from=$('#moduleFrom')?.value||'',to=$('#moduleTo')?.value||'';$$('#moduleTable tbody tr').forEach(r=>{const date=r.dataset.date||'',show=(!q||normalizeSearchText(r.dataset.search).includes(q))&&(!status||r.dataset.status===status)&&(!branch||r.dataset.branch===branch)&&(!from||date>=from)&&(!to||date<=to);r.style.display=show?'':'none'})};
const renderGenericModuleV35=renderGenericModule;
renderGenericModule=function(route){let html=renderGenericModuleV35(route);if(route==='advances')html=html.replace('</div><div class="grid grid-3">','</div><div class="notice advance-finance-note"><strong>الربط المالي:</strong> بعد اعتماد السلفة وتأكيد صرفها، يبدأ خصم القسط تلقائيًا من راتب الموظف اعتبارًا من شهر بداية الخصم.</div><div class="grid grid-3">');return html};
const setModuleStatusV35=setModuleStatus;
setModuleStatus=function(route,id,status){const cfg=EXTRA_MODULES[route],r=state[cfg.stateKey]?.find(x=>x.id===id);if(!r)return;const old=r.status;setModuleStatusV35(route,id,status);r.statusUpdatedBy=currentUser.id;r.statusUpdatedAt=new Date().toISOString();if(route==='advances'){if(status==='approved'){r.approvedBy=currentUser.id;r.approvedAt=r.statusUpdatedAt}if(status==='paid'){r.disbursedBy=currentUser.id;r.disbursedAt=r.statusUpdatedAt}if(status==='rejected')r.rejectedAt=r.statusUpdatedAt;logAudit('تحديث سلفة','المالية',`${emp(r.employeeId)?.name||'-'} — ${statusText(old)} ← ${statusText(status)} — ${moneyForEmployee(r.amount,r.employeeId)}`);saveState()}};
const applyModuleSideEffectsV35=applyModuleSideEffects;
applyModuleSideEffects=function(route,r){applyModuleSideEffectsV35(route,r);if(route==='advances'){r.branch=emp(r.employeeId)?.branch||r.branch||'';r.installments=Math.max(1,Number(r.installments||1));r.installmentAmount=Number(r.amount||0)/r.installments}};
function monthIndex(value){const [y,m]=String(value||'').split('-').map(Number);return Number.isFinite(y)&&Number.isFinite(m)?y*12+m-1:0}
function advanceInstallmentForMonth(employeeId,month){const target=monthIndex(month);return state.advances.filter(a=>a.employeeId===employeeId&&['paid'].includes(a.status)&&a.startMonth).reduce((sum,a)=>{const start=monthIndex(a.startMonth),count=Math.max(1,Number(a.installments||1)),idx=target-start;return sum+(idx>=0&&idx<count?Number(a.amount||0)/count:0)},0)}
const payrollBreakdownV35=payrollBreakdown;
function approvedDuesForMonth(employeeId,month,endDate=''){return (state.dues||[]).filter(d=>d.employeeId===employeeId&&['approved','paid'].includes(d.status)&&String(d.date||'').startsWith(month)&&(!endDate||d.date<=endDate)).reduce((sum,d)=>sum+Number(d.amount||0),0)}
payrollBreakdown=function(e,month,mode='auto'){const p=payrollBreakdownV35(e,month,mode),advanceDeduction=advanceInstallmentForMonth(e.id,month),approvedDues=approvedDuesForMonth(e.id,month,p.periodEnd);p.advanceDeduction=advanceDeduction;p.approvedDues=approvedDues;p.rewards=Number(p.rewards||0)+approvedDues;p.gross=Number(p.gross||0)+approvedDues;p.otherDeductions=Number(p.otherDeductions||0)+advanceDeduction;p.deductions=Number(p.deductions||0)+advanceDeduction;p.net=Number(p.net||0)+approvedDues-advanceDeduction;return p};

const afterRenderV35=afterRender;
afterRender=function(){afterRenderV35();installInlineSectionFilters();applyLanguage()};



/* ===== v3.7: remove upper global filters and integrate date/PDF beside CSV ===== */
Object.assign(UI_TRANSLATIONS,{
  'تصفية بالتاريخ':'Filter by date','بحث في السجلات':'Search records','تصدير CSV':'Export CSV','تصدير PDF':'Export PDF',
  'حدد الفرع والشهر ونطاق الاحتساب والموظفين':'Select branch, month, calculation range, and employees',
  'الموظفون المطلوب احتساب رواتبهم':'Employees to include in payroll',
  'اختر الفرع أولًا':'Select a branch first','لا يوجد موظفون نشطون':'No active employees',
  'تحديد الكل':'Select all','مسح التحديد':'Clear selection','احتساب الرواتب المحددة':'Calculate selected payrolls'
});

function v37SectionRows(){
  const scope=$('#sectionSearchScope');
  return scope?[...scope.querySelectorAll('table tbody tr')].filter(r=>r.children.length>1):[];
}
function v37FindToolbar(scope){
  if(currentView==='custody')return scope.querySelector('.custody-toolbar');
  if(currentView==='payroll')return scope.querySelector('.payroll-filterbar');
  return scope.querySelector('.toolbar');
}
function v37CreateToolbar(scope){
  const table=scope.querySelector('table');if(!table)return null;
  const wrap=table.closest('.table-wrap')||table;
  const toolbar=document.createElement('div');
  toolbar.className='toolbar native-integrated-toolbar';
  if(currentView==='expenses')toolbar.classList.add('expense-table-toolbar');
  wrap.insertAdjacentElement('beforebegin',toolbar);
  return toolbar;
}
function v37DateFieldsHTML(){
  return `<div class="native-date-pair" data-v37-date-pair="1"><div class="native-date-field"><label>من تاريخ</label><input class="input" id="nativeDateFrom" type="date"></div><div class="native-date-field"><label>إلى تاريخ</label><input class="input" id="nativeDateTo" type="date"></div></div>`;
}
function v37StatusOptions(){return sectionStatusConfig(currentView)?.statuses||[]}
function v37EnsureSearchAndStatus(toolbar){
  const hasText=[...toolbar.querySelectorAll('input')].some(i=>!['date','month','number','checkbox'].includes(i.type));
  if(!hasText){const input=document.createElement('input');input.className='input native-search';input.id='nativeSectionSearch';input.placeholder='بحث في السجلات';toolbar.prepend(input)}
  const hasStatus=[...toolbar.querySelectorAll('select')].some(s=>/status|حالة/i.test(`${s.id} ${s.name} ${s.getAttribute('aria-label')||''}`)||[...s.options].some(o=>['pending','approved','rejected','active','inactive','paid','draft','locked','returned'].includes(o.value)));
  const statuses=v37StatusOptions();
  if(!hasStatus&&statuses.length){const select=document.createElement('select');select.className='select';select.id='nativeSectionStatus';select.innerHTML=`<option value="">كل الحالات</option>${statuses.map(([v,l])=>`<option value="${escapeHTML(v)}">${escapeHTML(l)}</option>`).join('')}`;toolbar.appendChild(select)}
}
function v37EnsureExports(scope,toolbar){
  let csv=[...toolbar.querySelectorAll('button')].find(b=>/تصدير CSV|Export CSV|تصدير Excel|Export Excel/.test(b.textContent));
  if(!csv){
    const outside=[...scope.querySelectorAll('button')].find(b=>/تصدير CSV|Export CSV/.test(b.textContent));
    if(outside){csv=outside;toolbar.appendChild(csv)}
  }
  if(!csv){csv=document.createElement('button');csv.className='btn btn-secondary';toolbar.appendChild(csv)}
  csv.type='button';csv.textContent='⇩ تصدير CSV';csv.setAttribute('onclick','exportVisibleSectionCSVV37()');
  let pdf=[...toolbar.querySelectorAll('button')].find(b=>/تصدير PDF|Export PDF/.test(b.textContent));
  if(!pdf){pdf=document.createElement('button');pdf.className='btn btn-primary v37-pdf-export';pdf.type='button';pdf.textContent='▤ تصدير PDF';pdf.setAttribute('onclick','exportVisibleSectionPDF()');csv.insertAdjacentElement('afterend',pdf)}
  else{pdf.textContent='▤ تصدير PDF';pdf.setAttribute('onclick','exportVisibleSectionPDF()')}
  const duplicate=[...scope.querySelectorAll('button')].filter(b=>b!==csv&&b!==pdf&&/تصدير PDF|Export PDF/.test(b.textContent)&&!b.closest('.reports-page')&&!b.closest('.attendance-page'));
  duplicate.forEach(b=>b.remove());
}
function v37AnnotateDates(){
  const scope=$('#sectionSearchScope');if(!scope)return;
  if(currentView==='employees'){
    [...scope.querySelectorAll('#employeesTable tbody tr')].forEach((r,i)=>{const e=state.employees[i];if(e){r.dataset.date=e.hireDate||'';r.dataset.from=e.hireDate||'';r.dataset.to=e.hireDate||''}})
  }else if(currentView==='documents'){
    const list=[...visibleDocuments()].sort((a,b)=>String(a.expiryDate||'9999').localeCompare(String(b.expiryDate||'9999')));
    [...scope.querySelectorAll('#documentsTable tbody tr')].forEach((r,i)=>{const x=list[i];if(x){r.dataset.date=x.issueDate||x.expiryDate||'';r.dataset.from=x.issueDate||x.expiryDate||'';r.dataset.to=x.expiryDate||x.issueDate||''}})
  }else if(currentView==='expenses'){
    const list=[...state.expenses].sort((a,b)=>String(b.date).localeCompare(String(a.date)));
    [...scope.querySelectorAll('.expense-table tbody tr')].forEach((r,i)=>{if(list[i])r.dataset.date=list[i].date||''})
  }else if(currentView==='adjustments'){
    const ids=visibleEmployees().map(e=>e.id),list=state.adjustments.filter(x=>ids.includes(x.employeeId)).sort((a,b)=>b.date.localeCompare(a.date));
    [...scope.querySelectorAll('table tbody tr')].forEach((r,i)=>{if(list[i])r.dataset.date=list[i].date||''})
  }else if(currentView==='custody'){
    scope.querySelectorAll('tr[data-custody]').forEach(r=>{const id=String(r.id||'').replace('custody-row-',''),x=state.custodies.find(v=>v.id===id);if(x){r.dataset.date=x.assignedDate||'';r.dataset.from=x.assignedDate||'';r.dataset.to=x.returnDate||x.assignedDate||''}})
  }else if(currentView==='payroll'){
    scope.querySelectorAll('tr[data-payroll]').forEach(r=>{const m=r.dataset.month||'';if(/^\d{4}-\d{2}$/.test(m)){const [y,mo]=m.split('-').map(Number),last=new Date(y,mo,0).getDate();r.dataset.from=`${m}-01`;r.dataset.to=`${m}-${String(last).padStart(2,'0')}`;r.dataset.date=`${m}-01`}})
  }
}
function v37CallNativeFilter(){
  try{
    if(currentView==='employees')filterEmployeeRows();
    else if(currentView==='documents')filterDocumentRows();
    else if(currentView==='attendance')filterAttendanceRows();
    else if(currentView==='custody')filterCustodyRows();
    else if(currentView==='payroll')filterPayrollRows();
    else if(currentView==='audit')filterAuditRows();
    else if(EXTRA_MODULES[currentView])filterModuleRows(currentView);
  }catch(e){console.warn('Native filter',e)}
}
function v37SyncGroupedVisibility(){
  if(currentView==='custody'){
    let total=0;$$('[data-custody-branch-group]').forEach(group=>{const rows=$$('tr[data-custody]',group),visible=rows.filter(r=>r.style.display!=='none'&&!r.classList.contains('v37-filter-hidden')).length;group.classList.toggle('filter-hidden',visible===0);const c=group.querySelector('.custody-branch-visible');if(c)c.textContent=visible;total+=visible});if($('#custodyVisibleCount'))$('#custodyVisibleCount').textContent=total;$('#custodyEmptyFilter')?.classList.toggle('hidden',total!==0)
  }
  if(currentView==='payroll'){
    let total=0;$$('[data-payroll-branch-group]').forEach(group=>{const rows=$$('tr[data-payroll]',group),visible=rows.filter(r=>r.style.display!=='none'&&!r.classList.contains('v37-filter-hidden')).length;group.classList.toggle('filter-hidden',visible===0);total+=visible});if($('#payrollVisibleCount'))$('#payrollVisibleCount').textContent=total;$('#payrollEmptyFilter')?.classList.toggle('hidden',total!==0)
  }
}
function applyNativeSectionFiltersV37(){
  const scope=$('#sectionSearchScope');if(!scope)return;
  const rows=v37SectionRows();rows.forEach(r=>r.classList.remove('v37-filter-hidden'));
  v37CallNativeFilter();
  const q=normalizeSearchText($('#nativeSectionSearch')?.value||''),status=$('#nativeSectionStatus')?.value||'',from=$('#nativeDateFrom')?.value||'',to=$('#nativeDateTo')?.value||'';
  let shown=0;
  rows.forEach(r=>{
    if(r.style.display==='none')return;
    const text=normalizeSearchText(`${r.dataset.search||''} ${r.textContent||''}`),matchesQ=!q||text.includes(q),matchesStatus=!status||r.dataset.status===status||normalizeSearchText(targetStatus(r)).includes(normalizeSearchText(statusText(status))),matchesDate=elementMatchesDateRange(r,from,to),show=matchesQ&&matchesStatus&&matchesDate;
    r.classList.toggle('v37-filter-hidden',!show);if(show)shown++
  });
  const counter=$('#nativeVisibleCount');if(counter)counter.textContent=shown;
  v37SyncGroupedVisibility();
}
function installNativeSectionFiltersV37(){
  document.querySelector('#inlineSectionFilters')?.remove();
  document.querySelector('.section-tools')?.remove();
  document.querySelector('.section-search-bar')?.remove();
  if(['dashboard','settings','services','reports'].includes(currentView))return;
  if(currentView==='attendance'){filterAttendanceRows();return}
  const scope=$('#sectionSearchScope');if(!scope||!scope.querySelector('table'))return;
  let toolbar=v37FindToolbar(scope)||v37CreateToolbar(scope);if(!toolbar)return;
  toolbar.classList.add('native-integrated-toolbar');
  v37EnsureSearchAndStatus(toolbar);
  if(!toolbar.querySelector('[data-v37-date-pair]')){
    const holder=document.createElement('div');holder.innerHTML=v37DateFieldsHTML();
    const exportButton=[...toolbar.querySelectorAll('button')].find(b=>/تصدير CSV|Export CSV|تصدير Excel|Export Excel/.test(b.textContent));
    if(exportButton)exportButton.insertAdjacentElement('beforebegin',holder.firstElementChild);else toolbar.appendChild(holder.firstElementChild)
  }
  v37EnsureExports(scope,toolbar);
  if(!toolbar.querySelector('#nativeVisibleCount')){const c=document.createElement('span');c.className='result-counter';c.innerHTML='<b id="nativeVisibleCount">—</b> سجل';toolbar.appendChild(c)}
  v37AnnotateDates();
  if(toolbar.dataset.v37Bound!=='1'){
    toolbar.dataset.v37Bound='1';
    toolbar.addEventListener('input',()=>setTimeout(applyNativeSectionFiltersV37,0));
    toolbar.addEventListener('change',()=>setTimeout(applyNativeSectionFiltersV37,0));
  }
  applyLanguage(toolbar);applyNativeSectionFiltersV37();
}

visibleTableData=function(){
  const scope=$('#sectionSearchScope'),tables=[...scope.querySelectorAll('table')],sections=[];
  tables.forEach((table,index)=>{
    const headers=[...table.querySelectorAll('thead th')].map(th=>th.textContent.trim()).filter(h=>h&&!/إجراءات|Actions|تحديد/.test(h));
    const rows=[...table.querySelectorAll('tbody tr')].filter(r=>r.style.display!=='none'&&!r.classList.contains('section-search-hidden')&&!r.classList.contains('v37-filter-hidden')).map(r=>[...r.querySelectorAll('td')].filter(td=>!td.classList.contains('selection-col')&&!td.classList.contains('check-col')&&!td.querySelector('.actions,.att-row-actions')).map(td=>td.innerText.replace(/\s+/g,' ').trim()));
    if(headers.length&&rows.length)sections.push({title:`${sectionSearchLabel()} ${index+1}`,headers,rows})
  });
  return sections;
};
function exportVisibleSectionCSVV37(){
  if(currentView==='attendance'){exportAttendance();return}
  const sections=visibleTableData();if(!sections.length)return toast('لا توجد بيانات ظاهرة للتصدير','error');
  const max=Math.max(...sections.map(s=>s.headers.length)),headers=['القسم',...Array.from({length:max},(_,i)=>sections.find(s=>s.headers[i])?.headers[i]||`حقل ${i+1}`)],rows=[];
  sections.forEach(s=>s.rows.forEach(r=>rows.push([s.title,...r])));
  downloadCSV(`orbit-${currentView}-${todayISO()}.csv`,headers,rows);toast('تم تجهيز ملف CSV بالسجلات الظاهرة')
}

// Keep the original native section toolbar only. Do not install the separate upper filter panel.
afterRender=function(){afterRenderV35();installNativeSectionFiltersV37();applyLanguage()};

/* ===== v3.7.5: Branded PDF + Styled Excel exports ===== */
function exportNowText(){return new Intl.DateTimeFormat(currentLocale(),{year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date())}
function exportSafeText(value){const div=document.createElement('div');div.innerHTML=String(value??'').replace(/<br\s*\/?>/gi,' ');return (div.textContent||div.innerText||'').replace(/\s+/g,' ').trim()}
function exportViewTitle(){return (REPORT_TYPES?.[currentReportType]?.label)||(NAV.find(n=>n[0]===currentView)?.[2])||(EXTRA_MODULES?.[currentView]?.label)||'تقرير'}
function exportFileSlug(value){return String(value||'orbit-report').replace(/[\\/:*?"<>|]+/g,'-').replace(/\s+/g,'-').slice(0,80)}
function xmlEscape(value){return String(value??'').replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]))}
function sheetName(value,index=1,used=new Set()){let name=String(value||`Sheet ${index}`).replace(/[\\/\?\*\[\]:]/g,' ').replace(/\s+/g,' ').trim().slice(0,28)||`Sheet ${index}`;let final=name,n=2;while(used.has(final)){final=`${name.slice(0,25)} ${n++}`.slice(0,31)}used.add(final);return final}
function excelCell(value,style='Default'){const raw=value??'',num=typeof raw==='number'||(/^[-+]?\d+(\.\d+)?$/.test(String(raw).trim())&&String(raw).trim().length<16);return `<Cell ss:StyleID="${style}"><Data ss:Type="${num?'Number':'String'}">${xmlEscape(raw)}</Data></Cell>`}
function excelRow(cells,style='Default'){return `<Row>${cells.map(v=>excelCell(v,style)).join('')}</Row>`}
function exportMetaRows(extra=[]){
  const meta=[['اسم الشركة',state.settings.company||APP_NAME],['تاريخ التصدير',exportNowText()],['المستخدم',currentUser?.name||'-']];
  if(currentView&&currentView!=='reports')meta.push(['القسم',sectionSearchLabel()]);
  const filters=[];
  const add=(label,val)=>{if(val)filters.push(`${label}: ${val}`)};
  add('بحث',$('#nativeSectionSearch')?.value||$('#sectionGlobalSearch')?.value||'');
  add('من تاريخ',$('#nativeDateFrom')?.value||$('#sectionDateFrom')?.value||$('#attFrom')?.value||'');
  add('إلى تاريخ',$('#nativeDateTo')?.value||$('#sectionDateTo')?.value||$('#attTo')?.value||'');
  add('الحالة',$('#nativeSectionStatus')?.selectedOptions?.[0]?.text||$('#attStatus')?.selectedOptions?.[0]?.text||'');
  add('الفرع',$('#payrollBranchFilter')?.value||$('#attBranch')?.value||'');
  add('الشهر',$('#payrollMonthFilter')?.value||'');
  if(currentView==='reports'){
    const f=getReportFilters();add('شهر التقرير',f.month);add('فرع التقرير',f.branch);add('القسم الإداري',f.department);add('الموظف',f.employeeId?emp(f.employeeId)?.name:'');
  }
  if(filters.length)meta.push(['الفلاتر',filters.join(' | ')]);
  extra.forEach(x=>{if(Array.isArray(x)&&x.length)meta.push(x)});
  return meta;
}
function downloadStyledExcel(filename,sections,options={}){
  sections=(sections||[]).filter(s=>s&&Array.isArray(s.headers)&&Array.isArray(s.rows));
  if(!sections.length)return toast('لا توجد بيانات للتصدير','error');
  const title=options.title||exportViewTitle(),subtitle=options.subtitle||'',used=new Set(),meta=options.meta||exportMetaRows(options.extraMeta||[]);
  const styles=`<Styles>
    <Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Horizontal="Right" ss:Vertical="Center" ss:ReadingOrder="RightToLeft" ss:WrapText="1"/><Font ss:FontName="Arial" ss:Size="10"/><Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E1D5C4"/></Borders></Style>
    <Style ss:ID="Title"><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ReadingOrder="RightToLeft"/><Font ss:FontName="Arial" ss:Size="17" ss:Bold="1" ss:Color="#1F1712"/><Interior ss:Color="#E8C48B" ss:Pattern="Solid"/></Style>
    <Style ss:ID="Subtitle"><Alignment ss:Horizontal="Center" ss:ReadingOrder="RightToLeft" ss:WrapText="1"/><Font ss:FontName="Arial" ss:Size="10" ss:Color="#6D563C"/><Interior ss:Color="#F7EFE2" ss:Pattern="Solid"/></Style>
    <Style ss:ID="MetaLabel"><Alignment ss:Horizontal="Right" ss:ReadingOrder="RightToLeft"/><Font ss:FontName="Arial" ss:Bold="1" ss:Color="#3B2B1D"/><Interior ss:Color="#F3E6D2" ss:Pattern="Solid"/></Style>
    <Style ss:ID="MetaValue"><Alignment ss:Horizontal="Right" ss:ReadingOrder="RightToLeft" ss:WrapText="1"/><Font ss:FontName="Arial" ss:Color="#1F1712"/><Interior ss:Color="#FBF7EF" ss:Pattern="Solid"/></Style>
    <Style ss:ID="Header"><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ReadingOrder="RightToLeft" ss:WrapText="1"/><Font ss:FontName="Arial" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#2B2118" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#C59A55"/></Borders></Style>
    <Style ss:ID="Data"><Alignment ss:Horizontal="Right" ss:Vertical="Center" ss:ReadingOrder="RightToLeft" ss:WrapText="1"/><Font ss:FontName="Arial" ss:Size="10" ss:Color="#1F1712"/><Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E8DED0"/></Borders></Style>
  </Styles>`;
  const worksheets=sections.map((section,i)=>{
    const maxCols=Math.max(2,section.headers.length,...section.rows.map(r=>r.length));
    const merge=maxCols>1?` ss:MergeAcross="${maxCols-1}"`:'';
    const cols=Array.from({length:maxCols},()=>'<Column ss:Width="120"/>').join('');
    const metaRows=meta.map(([k,v])=>`<Row>${excelCell(k,'MetaLabel')}${excelCell(v,'MetaValue')}</Row>`).join('');
    const body=(section.rows||[]).map(r=>excelRow(Array.from({length:maxCols},(_,idx)=>r[idx]??''),'Data')).join('');
    return `<Worksheet ss:Name="${xmlEscape(sheetName(section.title||title,i+1,used))}"><Table>${cols}<Row ss:Height="30"><Cell ss:StyleID="Title"${merge}><Data ss:Type="String">${xmlEscape(title)}</Data></Cell></Row>${subtitle?`<Row><Cell ss:StyleID="Subtitle"${merge}><Data ss:Type="String">${xmlEscape(subtitle)}</Data></Cell></Row>`:''}${metaRows}<Row></Row>${excelRow(Array.from({length:maxCols},(_,idx)=>section.headers[idx]??''),'Header')}${body}</Table><WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><DisplayRightToLeft/><FreezePanes/><FrozenNoSplit/><SplitHorizontal>1</SplitHorizontal/><TopRowBottomPane>1</TopRowBottomPane><Print><ValidPrinterInfo/><HorizontalResolution>600</HorizontalResolution/><VerticalResolution>600</VerticalResolution/></Print></WorksheetOptions></Worksheet>`;
  }).join('');
  const xml=`<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:html="http://www.w3.org/TR/REC-html40"><DocumentProperties xmlns="urn:schemas-microsoft-com:office:office"><Author>Orbit HR</Author><Company>${xmlEscape(state.settings.company||APP_NAME)}</Company><Title>${xmlEscape(title)}</Title><Created>${new Date().toISOString()}</Created></DocumentProperties>${styles}${worksheets}</Workbook>`;
  const out=String(filename||`orbit-${todayISO()}.xls`).replace(/\.(csv|xlsx?)$/i,'.xls');
  const blob=new Blob(['\uFEFF',xml],{type:'application/vnd.ms-excel;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=out;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('تم تجهيز ملف Excel منسق')
}
downloadCSV=function(filename,headers,rows){downloadStyledExcel(filename,[{title:exportViewTitle(),headers,rows}],{title:exportViewTitle()})}
function tableSectionTitle(table,index){const card=table.closest('.card,.payroll-branch-group,.custody-branch-group,[data-payroll-branch-group]');return exportSafeText(card?.querySelector('.card-title h3,.payroll-branch-head h3,.custody-branch-title strong,h3,strong')?.textContent)||`${exportViewTitle()} ${index+1}`}
visibleTableData=function(){
  const scope=$('#sectionSearchScope');if(!scope)return [];
  const tables=[...scope.querySelectorAll('table')],sections=[];
  tables.forEach((table,index)=>{
    if(table.closest('.no-print')||getComputedStyle(table).display==='none')return;
    const headerCells=[...table.querySelectorAll('thead th')].filter(th=>!th.classList.contains('selection-col')&&!th.classList.contains('check-col')&&!/إجراءات|Actions|تحديد|Select/i.test(th.textContent));
    const headers=headerCells.map(th=>exportSafeText(th.textContent)).filter(Boolean);
    const rows=[...table.querySelectorAll('tbody tr')].filter(r=>r.style.display!=='none'&&!r.classList.contains('section-search-hidden')&&!r.classList.contains('v37-filter-hidden')).map(r=>{
      const cells=[...r.querySelectorAll('td')].filter(td=>!td.classList.contains('selection-col')&&!td.classList.contains('check-col')&&!td.querySelector('.actions,.att-row-actions')&&!/^(تعديل|حذف|عرض|اعتماد|رفض)$/i.test(exportSafeText(td.textContent)));
      return cells.slice(0,headers.length).map(td=>exportSafeText(td.innerText||td.textContent));
    }).filter(r=>r.some(Boolean));
    if(headers.length&&rows.length)sections.push({title:tableSectionTitle(table,index),headers,rows})
  });
  return sections;
}
function brandedReportHTML(title,subtitle,sections,meta){
  const rowCount=sections.reduce((s,x)=>s+(x.rows?.length||0),0),company=state.settings.company||APP_NAME;
  return `<section id="brandedPrintReport" class="branded-print-report" dir="rtl"><header class="brand-report-header"><div class="brand-report-identity"><img src="orbit-logo-ui.png" alt="Orbit"><div><h1>${escapeHTML(company)}</h1><p>نظام الموارد البشرية والخدمات</p></div></div><div class="brand-report-title"><h2>${escapeHTML(title)}</h2>${subtitle?`<p>${escapeHTML(subtitle)}</p>`:''}</div></header><div class="brand-report-meta"><div><span>تاريخ التصدير</span><strong>${escapeHTML(exportNowText())}</strong></div><div><span>عدد السجلات</span><strong>${rowCount}</strong></div>${meta.map(([k,v])=>`<div><span>${escapeHTML(k)}</span><strong>${escapeHTML(v||'-')}</strong></div>`).join('')}</div>${sections.map(sec=>`<article class="brand-report-section"><h3>${escapeHTML(sec.title)}</h3><table class="brand-report-table"><thead><tr>${sec.headers.map(h=>`<th>${escapeHTML(h)}</th>`).join('')}</tr></thead><tbody>${sec.rows.map(r=>`<tr>${sec.headers.map((_,i)=>`<td>${escapeHTML(r[i]??'')}</td>`).join('')}</tr>`).join('')}</tbody></table></article>`).join('')}<footer class="brand-report-footer"><span>تم إنشاء التقرير بواسطة Orbit HR</span><span>${escapeHTML(company)}</span></footer></section>`;
}
function printBrandedPDF(title,sections,options={}){
  sections=(sections||[]).filter(s=>s?.headers?.length&&s?.rows?.length);if(!sections.length)return toast('لا توجد بيانات ظاهرة للطباعة','error');
  $('#brandedPrintReport')?.remove();document.body.insertAdjacentHTML('beforeend',brandedReportHTML(title,options.subtitle||'',sections,options.meta||[]));
  const old=document.title;document.title=exportFileSlug(options.fileName||title||'Orbit-Report');document.body.classList.add('printing-branded-report');
  setTimeout(()=>{window.print();document.body.classList.remove('printing-branded-report');$('#brandedPrintReport')?.remove();document.title=old},80)
}
exportVisibleSectionPDF=function(){const sections=visibleTableData();printBrandedPDF(exportViewTitle(),sections,{subtitle:'تقرير السجلات الظاهرة حسب الفلاتر الحالية',meta:exportMetaRows().slice(1)})}
exportCurrentSectionPDF=function(){exportVisibleSectionPDF()}
exportVisibleSectionCSVV37=function(){const sections=visibleTableData();downloadStyledExcel(`orbit-${currentView}-${todayISO()}.xls`,sections,{title:exportViewTitle(),subtitle:'السجلات الظاهرة حسب الفلاتر الحالية'})}
function exportAttendance(){
  const r=filteredAttendanceRecords();
  const rows=r.map(a=>{const e=emp(a.employeeId),plan=shiftDaySchedule(shift(e?.shiftId),a.date),source=a.source==='auto'?'توليد تلقائي':(a.source==='manual'||a.location==='إدخال يدوي')?'تسجيل يدوي':'تطبيق الجوال';return [e?.code||'',e?.name||'',e?.branch||'',e?.department||'',a.date,plan?`${plan.start} - ${plan.end}`:'راحة',fmtTime(a.checkIn),fmtTime(a.checkOut),minutesToHM(attendanceActualMinutes(a)),a.location||'',a.checkOutLocation||'',a.lateMinutes||0,a.overtimeMinutes||0,({present:'حاضر',late:'متأخر',absent:'غائب'}[a.status]||a.status),source,attendanceIssueLabel(attendanceIssue(a))]});
  downloadStyledExcel('orbit-attendance.xls',[{title:'الحضور والانصراف',headers:['كود الموظف','الموظف','الفرع','القسم','التاريخ','الوردية','الدخول','الخروج','ساعات العمل','موقع الحضور','موقع الانصراف','التأخير بالدقائق','الإضافي بالدقائق','الحالة','المصدر','ملاحظة'],rows}],{title:'تقرير الحضور والانصراف',subtitle:'حسب فلاتر الحضور الحالية'})
}
printAttendancePDF=function(){const sections=visibleTableData();if(sections.length)printBrandedPDF('تقرير الحضور والانصراف',sections,{subtitle:'السجلات الظاهرة حسب فلاتر الحضور'});else{const r=filteredAttendanceRecords(),headers=['كود الموظف','الموظف','الفرع','التاريخ','الوردية','الدخول','الخروج','ساعات العمل','التأخير','الإضافي','الحالة','المصدر'],rows=r.map(a=>{const e=emp(a.employeeId),plan=shiftDaySchedule(shift(e?.shiftId),a.date);return [e?.code||'',e?.name||'',e?.branch||'',a.date,plan?`${plan.start} - ${plan.end}`:'راحة',fmtTime(a.checkIn),fmtTime(a.checkOut),minutesToHM(attendanceActualMinutes(a)),a.lateMinutes||0,a.overtimeMinutes||0,statusText(a.status),a.source==='auto'?'توليد تلقائي':(a.source==='manual'||a.location==='إدخال يدوي')?'تسجيل يدوي':'تطبيق الجوال']});printBrandedPDF('تقرير الحضور والانصراف',[{title:'سجلات الحضور',headers,rows}],{subtitle:'حسب فلاتر الحضور الحالية'})}}
exportCurrentReport=function(){const f=getReportFilters(),ctx=reportContext(f.month,f.branch,f.department,f.employeeId),data=reportExportData(currentReportType,ctx),item=REPORT_TYPES[currentReportType]||{};downloadStyledExcel(`orbit-${exportFileSlug(currentReportType||'report')}-${f.month}.xls`,[{title:item.label||'تقرير',headers:data.headers,rows:data.rows}],{title:item.label||'تقرير',subtitle:reportFilterSummary(ctx),meta:exportMetaRows([['نوع التقرير',item.label||currentReportType||'تقرير']])})}
printCurrentReport=function(){const f=getReportFilters(),ctx=reportContext(f.month,f.branch,f.department,f.employeeId),data=reportExportData(currentReportType,ctx),item=REPORT_TYPES[currentReportType]||{};printBrandedPDF(item.label||'تقرير',[{title:item.label||'تفاصيل التقرير',headers:data.headers,rows:data.rows}],{subtitle:reportFilterSummary(ctx),meta:exportMetaRows([['نوع التقرير',item.label||currentReportType||'تقرير']])})}
exportSelectedPayrollPDF=function(){const rows=selectedRows().filter(r=>r.matches('tr[data-payroll]'));if(!rows.length)return toast('حدد رواتب أولًا','error');const list=rows.map(r=>state.payroll.find(p=>p.id===r.dataset.recordId)).filter(Boolean);const groups=Object.values(list.reduce((m,p)=>{const branch=emp(p.employeeId)?.branch||'بدون فرع';(m[branch] ||= {title:branch,headers:['الكود','الموظف','الشهر','النطاق','الراتب الشهري','الأساسي','الإضافي','المكافآت','إجمالي الاستحقاقات','إجمالي الخصومات','الصافي','الحالة'],rows:[]});const e=emp(p.employeeId),c=p.currency||employeeCurrency(p.employeeId),gross=p.gross||Number(p.base||0)+Number(p.overtime||0)+Number(p.rewards||0);m[branch].rows.push([e?.code||'',e?.name||'',p.month,payrollModeLabel(p),money(p.contractBase||p.base,c),money(p.base,c),money(p.overtime,c),money(p.rewards||0,c),money(gross,c),money(p.deductions,c),money(p.net,c),statusText(p.status)]);return m},{}));printBrandedPDF('تقرير رواتب الموظفين المحددين',groups,{subtitle:`عدد السجلات المحددة: ${list.length}`,meta:exportMetaRows([['نوع التصدير','رواتب محددة']])})}
function v37EnsureExports(scope,toolbar){
  let excel=[...toolbar.querySelectorAll('button')].find(b=>/تصدير CSV|Export CSV|تصدير Excel|Export Excel/.test(b.textContent));
  if(!excel){const outside=[...scope.querySelectorAll('button')].find(b=>/تصدير CSV|Export CSV|تصدير Excel|Export Excel/.test(b.textContent));if(outside){excel=outside;toolbar.appendChild(excel)}}
  if(!excel){excel=document.createElement('button');excel.className='btn btn-success';toolbar.appendChild(excel)}
  excel.type='button';excel.className='btn btn-success';excel.textContent='▣ تصدير Excel';excel.setAttribute('onclick','exportVisibleSectionCSVV37()');
  let pdf=[...toolbar.querySelectorAll('button')].find(b=>/تصدير PDF|Export PDF/.test(b.textContent));
  if(!pdf){pdf=document.createElement('button');pdf.className='btn btn-primary v37-pdf-export';excel.insertAdjacentElement('afterend',pdf)}
  pdf.type='button';pdf.textContent='▤ تصدير PDF';pdf.setAttribute('onclick','exportVisibleSectionPDF()');
  [...scope.querySelectorAll('button')].filter(b=>b!==excel&&b!==pdf&&/تصدير PDF|Export PDF/.test(b.textContent)&&!b.closest('.reports-page')&&!b.closest('.attendance-page')).forEach(b=>b.remove());
}
function polishExportButtonsV375(){
  $$('button').forEach(b=>{const t=b.textContent||'';if(/تصدير CSV|Excel \/ CSV/.test(t)){b.textContent=t.replace('تصدير CSV','تصدير Excel').replace('Excel / CSV','Excel').replace('⇩','▣');b.classList.add('btn-success')}});
  $$('.reports-action-btn, .report-filter-actions .btn').forEach(b=>{if(/Excel/.test(b.textContent))b.setAttribute('onclick','exportCurrentReport()');if(/PDF/.test(b.textContent))b.setAttribute('onclick','printCurrentReport()')});
}
const afterRenderV375=afterRender;
afterRender=function(){afterRenderV375();polishExportButtonsV375()};


/* ===== v3.9.0: Professional readiness, app-store preparation and quality center ===== */
let deferredInstallPrompt = null;

function issueLevelLabel(level){return level==='danger'?'حرج':level==='warning'?'تحذير':'جاهز'}
function issueBadge(level){return `<span class="badge badge-${level==='danger'?'danger':level==='warning'?'warning':'success'}">${issueLevelLabel(level)}</span>`}
function findDuplicateValues(list, valueFn){
  const seen=new Map(),dups=[];
  (list||[]).forEach(item=>{
    const value=String(valueFn(item)||'').trim().toLowerCase();
    if(!value)return;
    if(seen.has(value))dups.push(value);
    else seen.set(value,item);
  });
  return [...new Set(dups)];
}
function addReadinessIssue(issues,level,area,title,details,fix=''){
  issues.push({level,area,title,details,fix});
}
function professionalHealthChecks(){
  const issues=[];
  const employees=state.employees||[], users=state.users||[], payroll=state.payroll||[], attendance=state.attendance||[], docs=state.documents||[];
  const branches=getBranches(), departments=getDepartments(), shifts=state.shifts||[], profiles=getPermissionProfiles();
  const employeesById=new Set(employees.map(e=>e.id));
  const activeAdmins=users.filter(u=>u.active!==false&&u.role==='admin');

  if(!state.settings.company||state.settings.company===APP_NAME)addReadinessIssue(issues,'warning','هوية الشركة','بيانات الشركة تحتاج مراجعة','راجع اسم الشركة وبياناتها قبل النشر الرسمي.','الإعدادات ← المنشأة والهيكل');
  if(!branches.length)addReadinessIssue(issues,'danger','الهيكل الإداري','لا توجد فروع','يجب وجود فرع واحد على الأقل.','أضف فرعًا من الإعدادات');
  if(!departments.length)addReadinessIssue(issues,'danger','الهيكل الإداري','لا توجد أقسام','يجب وجود قسم واحد على الأقل.','أضف قسمًا من الإعدادات');
  branches.forEach(b=>{if(!CURRENCIES[getBranchCurrency(b)])addReadinessIssue(issues,'warning','العملات','عملة فرع غير محددة',`الفرع ${b} لا توجد له عملة صحيحة.`,'حدد عملة الفرع من الإعدادات')});

  const dupEmployeeCodes=findDuplicateValues(employees,e=>e.code);
  if(dupEmployeeCodes.length)addReadinessIssue(issues,'danger','الموظفون','أكواد موظفين مكررة',dupEmployeeCodes.join('، '),'صحح الأكواد قبل الاحتساب والتصدير');
  const dupEmployeeEmails=findDuplicateValues(employees,e=>e.email);
  if(dupEmployeeEmails.length)addReadinessIssue(issues,'danger','الموظفون','بريد وظيفي مكرر',dupEmployeeEmails.join('، '),'اجعل البريد فريدًا لكل موظف');
  const dupEmployeePhones=findDuplicateValues(employees,e=>e.phone);
  if(dupEmployeePhones.length)addReadinessIssue(issues,'warning','الموظفون','أرقام هاتف مكررة',dupEmployeePhones.join('، '),'راجع أرقام الهواتف');
  employees.forEach(e=>{
    if(!e.name||!e.code||!e.email)addReadinessIssue(issues,'danger','الموظفون','بيانات أساسية ناقصة',`${e.name||e.code||'موظف بدون اسم'} يحتاج اسم/كود/بريد.`,'افتح ملف الموظف وأكمل البيانات');
    if(!branches.includes(e.branch))addReadinessIssue(issues,'warning','الموظفون','فرع غير موجود',`${e.name||e.code} مرتبط بفرع غير معرف: ${e.branch||'-'}`,'اختر فرعًا صحيحًا');
    if(!departments.includes(e.department))addReadinessIssue(issues,'warning','الموظفون','قسم غير موجود',`${e.name||e.code} مرتبط بقسم غير معرف: ${e.department||'-'}`,'اختر قسمًا صحيحًا');
    if(e.status==='active'&&!shifts.some(s=>s.id===e.shiftId))addReadinessIssue(issues,'warning','الحضور','موظف نشط بدون وردية صحيحة',`${e.name||e.code} يحتاج وردية لضبط التأخير والغياب.`,'اربط الموظف بوردية');
    if(Number(e.salary||0)<=0)addReadinessIssue(issues,'warning','الرواتب','راتب أساسي غير محدد',`${e.name||e.code} راتبه صفر أو غير مكتمل.`,'أكمل الراتب الأساسي');
  });

  const dupUserEmails=findDuplicateValues(users,u=>u.email);
  if(dupUserEmails.length)addReadinessIssue(issues,'danger','الحسابات','بريد دخول مكرر',dupUserEmails.join('، '),'صحح حسابات الدخول');
  const dupUserEmployees=findDuplicateValues(users,u=>u.employeeId);
  if(dupUserEmployees.length)addReadinessIssue(issues,'danger','الحسابات','موظف مرتبط بأكثر من حساب','يوجد أكثر من حساب لنفس الموظف.','اترك حسابًا واحدًا فقط لكل موظف');
  if(!activeAdmins.length)addReadinessIssue(issues,'danger','الأمان','لا يوجد مسؤول نظام نشط','يجب وجود مسؤول نشط واحد على الأقل.','فعّل حساب مسؤول أو امنح صلاحية admin');
  users.forEach(u=>{
    if(u.employeeId&&!employeesById.has(u.employeeId))addReadinessIssue(issues,'danger','الحسابات','حساب بدون موظف مرتبط',`${u.email} مرتبط بموظف غير موجود.`,'اربط الحساب بموظف صحيح أو احذفه');
    if(!['admin','manager','employee'].includes(u.role)&&!profiles.some(p=>p.id===u.role))addReadinessIssue(issues,'warning','الصلاحيات','حساب مرتبط بمجموعة غير موجودة',`${u.email} يستخدم مجموعة ${u.role}`,'اختر مجموعة صلاحيات صحيحة');
    const pass=String(u.password||'');
    if(['admin123','manager123','employee123','123456','password'].includes(pass.toLowerCase())||pass.length<8)addReadinessIssue(issues,'warning','الأمان','كلمة مرور ضعيفة أو تجريبية',`${u.email} يحتاج كلمة مرور أقوى قبل النشر.`,'غيّر كلمة المرور من ملف الموظف');
  });
  profiles.forEach(p=>{
    const perms=normalizePermissionArray(p.permissions||[]);
    if(!p.name)addReadinessIssue(issues,'warning','الصلاحيات','مجموعة بدون اسم',p.id,'سم المجموعة');
    if(!perms.length)addReadinessIssue(issues,'danger','الصلاحيات','مجموعة بدون صلاحيات',p.name||p.id,'حدد صلاحية واحدة على الأقل');
  });

  const payrollDup=findDuplicateValues(payroll,p=>`${p.employeeId}|${p.month}|${p.calculationMode||'full'}`);
  if(payrollDup.length)addReadinessIssue(issues,'danger','الرواتب','رواتب مكررة لنفس الموظف والشهر','توجد سجلات راتب مكررة قد تؤثر على الإجماليات.','احذف السجل المكرر من صفحة الرواتب');
  payroll.forEach(p=>{if(!employeesById.has(p.employeeId))addReadinessIssue(issues,'warning','الرواتب','راتب مرتبط بموظف محذوف',`${p.month} / ${p.employeeId}`,'احذف الراتب أو استرجع الموظف')});

  const attendanceDup=findDuplicateValues(attendance,a=>`${a.employeeId}|${a.date}`);
  if(attendanceDup.length)addReadinessIssue(issues,'warning','الحضور','سجلات حضور مكررة','توجد أكثر من حركة لنفس الموظف في نفس اليوم.','راجع صفحة الحضور واحذف التكرار');
  attendance.forEach(a=>{if(!employeesById.has(a.employeeId))addReadinessIssue(issues,'warning','الحضور','حضور مرتبط بموظف محذوف',`${a.date} / ${a.employeeId}`,'احذف السجل أو استرجع الموظف')});

  const soon=new Date();soon.setDate(soon.getDate()+30);
  docs.forEach(d=>{
    if(d.employeeId&&!employeesById.has(d.employeeId))addReadinessIssue(issues,'warning','المستندات','مستند بدون موظف صحيح',d.title||d.category,'اربط المستند بموظف صحيح');
    if(d.expiryDate){const x=new Date(d.expiryDate+'T12:00:00');if(x<new Date())addReadinessIssue(issues,'warning','المستندات','مستند منتهي',`${d.title||d.category} انتهى في ${fmtDate(d.expiryDate)}`,'جدد المستند أو أرشفه');else if(x<=soon)addReadinessIssue(issues,'info','المستندات','مستند يقترب من الانتهاء',`${d.title||d.category} ينتهي في ${fmtDate(d.expiryDate)}`,'تابع التجديد');}
  });

  if(location.protocol==='file:')addReadinessIssue(issues,'warning','التطبيق الجوال','التشغيل من ملف محلي','النشر للجوال يحتاج رابط HTTPS ثابت أو تغليف Capacitor/TWA.','ارفع النسخة على استضافة HTTPS');
  if(!('serviceWorker' in navigator))addReadinessIssue(issues,'warning','PWA','المتصفح لا يدعم Service Worker','التثبيت والعمل بدون إنترنت لن يكونا متاحين في هذا المتصفح.','اختبر على Chrome/Edge/Safari حديث');
  if(!window.isSecureContext&&location.hostname!=='localhost')addReadinessIssue(issues,'warning','PWA','السياق غير آمن','PWA والكاميرا/GPS تحتاج HTTPS في الإنتاج.','استخدم HTTPS');
  if((state.settings.requireGPS||state.settings.requireFace)&&location.protocol!=='https:'&&location.hostname!=='localhost')addReadinessIssue(issues,'warning','الحضور الجوال','GPS/Camera يحتاج HTTPS','التسجيل من الموبايل يحتاج HTTPS وصلاحيات المتصفح.','انشر على HTTPS');

  if(!issues.some(i=>i.level==='danger'||i.level==='warning'))addReadinessIssue(issues,'info','النظام','لا توجد مشاكل حرجة ظاهرة','البيانات الحالية اجتازت فحص الجودة الأساسي.','استمر في النسخ الاحتياطي الدوري');
  return issues;
}
function professionalReadinessSummary(){
  const issues=professionalHealthChecks();
  const danger=issues.filter(i=>i.level==='danger').length, warning=issues.filter(i=>i.level==='warning').length, info=issues.filter(i=>i.level==='info').length;
  const score=Math.max(0,Math.round(100-(danger*18)-(warning*7)));
  return {issues,danger,warning,info,score};
}
function readinessMetric(icon,value,title,sub,level='info'){
  return `<div class="card readiness-metric ${level}"><span>${icon}</span><div><strong>${value}</strong><p>${title}</p><small>${sub}</small></div></div>`;
}
function renderProfessionalReadiness(){
  const r=professionalReadinessSummary();
  const top=r.issues.filter(i=>i.level!=='info').slice(0,6);
  const installState=window.matchMedia?.('(display-mode: standalone)')?.matches?'مثبت':(deferredInstallPrompt?'جاهز للتثبيت':'متاح بعد HTTPS/المتصفح');
  return `<div class="professional-readiness-card">
    <div class="readiness-header"><div><span class="page-eyebrow">Professional Release</span><h3>مركز الجاهزية الاحترافية</h3><p>فحص سريع للبيانات، الأمان، وتجهيز الرفع كتطبيق موبايل.</p></div><div class="readiness-score"><strong>${r.score}%</strong><span>جاهزية</span></div></div>
    <div class="grid grid-4 readiness-grid">${readinessMetric('✓',r.issues.length,'إجمالي الفحوصات','فحص بيانات وتشغيل','info')}${readinessMetric('!',r.danger,'مشاكل حرجة','يجب إصلاحها','danger')}${readinessMetric('⚠',r.warning,'تحذيرات','يفضل مراجعتها','warning')}${readinessMetric('▣',installState,'حالة التثبيت','PWA / Mobile','success')}</div>
    <div class="readiness-actions"><button class="btn btn-primary" type="button" onclick="openProfessionalAuditModal()">تشغيل فحص الجودة</button><button class="btn btn-success" type="button" onclick="exportProfessionalReadinessPDF()">تصدير تقرير الجاهزية PDF</button><button class="btn btn-secondary" type="button" onclick="installOrbitApp()">تثبيت التطبيق</button><button class="btn btn-secondary" type="button" onclick="openLegalPage('privacy.html')">سياسة الخصوصية</button><button class="btn btn-secondary" type="button" onclick="openLegalPage('terms.html')">الشروط</button></div>
    ${top.length?`<div class="readiness-issues-preview">${top.map(i=>`<div class="readiness-issue-row"><span>${issueBadge(i.level)}</span><strong>${escapeHTML(i.title)}</strong><small>${escapeHTML(i.area)}</small><p>${escapeHTML(i.details)}</p></div>`).join('')}</div>`:`<div class="notice settings-notice">لا توجد مشاكل تشغيل حرجة في الفحص الحالي.</div>`}
  </div>`;
}
function renderSettingsSystem(s){
  const r=professionalReadinessSummary();
  return `<div class="settings-panel">${settingsPanelHeader('🛡','النظام والنسخ الاحتياطي','إدارة النسخ الاحتياطية، فحص الجودة، وتجهيز التطبيق للويب والموبايل.')}
  <div class="settings-section-grid">
    <div class="card settings-section-card full-span">${renderProfessionalReadiness()}</div>
    <div class="card settings-section-card"><div class="card-title"><div><h3>النسخ الاحتياطي والاسترجاع</h3><div class="small muted">نسخة JSON كاملة تشمل البيانات والمرفقات والإعدادات</div></div></div><div class="backup-actions settings-backup-actions"><button class="btn btn-primary" type="button" onclick="downloadBackup()">⇩ تحميل نسخة احتياطية</button><label class="btn btn-secondary">↥ استرجاع نسخة<input type="file" accept="application/json,.json" hidden onchange="restoreBackupFile(this)"></label><button class="btn btn-secondary" type="button" onclick="go('audit')">🛡 فتح سجل النظام</button></div><div class="notice settings-notice">احفظ نسخة احتياطية قبل أي تعديل كبير. الاسترجاع يستبدل البيانات الحالية بالكامل.</div></div>
    <div class="card settings-section-card"><div class="card-title"><div><h3>جاهزية الرفع كتطبيق</h3><div class="small muted">ملخص المطلوب قبل Google Play و App Store</div></div><span class="settings-count">${r.score}%</span></div><div class="status-panel professional-status"><div class="status-row"><span>PWA Manifest + Service Worker</span><span class="badge badge-success">مضاف</span></div><div class="status-row"><span>أيقونات التطبيق</span><span class="badge badge-success">مضافة</span></div><div class="status-row"><span>Privacy / Terms</span><span class="badge badge-success">مضافة</span></div><div class="status-row"><span>استضافة HTTPS وربط دومين</span><span class="badge badge-warning">مطلوب قبل النشر</span></div><div class="status-row"><span>Android TWA / Capacitor build</span><span class="badge badge-warning">قالب مرفق</span></div><div class="status-row"><span>iOS App Store build</span><span class="badge badge-warning">يحتاج Mac + Apple Developer</span></div><div class="status-row"><span>قاعدة بيانات مركزية ومزامنة</span><span class="badge badge-warning">مطلوب للإنتاج الحقيقي</span></div></div></div>
  </div></div>`;
}
function professionalAuditTableRows(){
  return professionalHealthChecks().map(i=>`<tr><td>${escapeHTML(i.area)}</td><td>${issueBadge(i.level)}</td><td><strong>${escapeHTML(i.title)}</strong><div class="small muted">${escapeHTML(i.details)}</div></td><td>${escapeHTML(i.fix||'-')}</td></tr>`).join('');
}
function openProfessionalAuditModal(){
  const r=professionalReadinessSummary();
  openModal('فحص جاهزية البرنامج',`<div class="readiness-modal-head"><div class="readiness-score"><strong>${r.score}%</strong><span>جاهزية</span></div><div><h3>نتيجة الفحص</h3><p class="muted">حرج: ${r.danger} · تحذير: ${r.warning} · ملاحظات: ${r.info}</p></div></div><div class="table-wrap"><table class="table compact-table"><thead><tr><th>القسم</th><th>الحالة</th><th>الملاحظة</th><th>الإجراء المقترح</th></tr></thead><tbody>${professionalAuditTableRows()}</tbody></table></div>`,null,'إغلاق');
}
function exportProfessionalReadinessPDF(){
  const rows=professionalHealthChecks().map(i=>[i.area,issueLevelLabel(i.level),i.title,i.details,i.fix||'-']);
  if(typeof printBrandedPDF==='function')printBrandedPDF('تقرير جاهزية Orbit HR للإنتاج',[{title:'نتيجة فحص الجودة والجاهزية',headers:['القسم','الحالة','الملاحظة','التفاصيل','الإجراء المقترح'],rows}],{subtitle:`درجة الجاهزية: ${professionalReadinessSummary().score}%`,meta:exportMetaRows([['الإصدار',APP_VERSION]])});
  else window.print();
}
function openLegalPage(file){
  window.open(file,'_blank','noopener');
}
function installOrbitApp(){
  if(window.matchMedia?.('(display-mode: standalone)')?.matches)return toast('التطبيق مثبت بالفعل');
  if(!deferredInstallPrompt)return toast('زر التثبيت يظهر بعد فتح النسخة من HTTPS أو localhost على متصفح يدعم PWA','error');
  deferredInstallPrompt.prompt();
  deferredInstallPrompt.userChoice.then(choice=>{logAudit('محاولة تثبيت التطبيق','PWA',choice.outcome||'');deferredInstallPrompt=null;render();});
}
function injectInstallButton(){
  const actions=$('.topbar-actions');
  if(!actions||$('#appInstallBtn'))return;
  const btn=document.createElement('button');
  btn.id='appInstallBtn';btn.className='icon-btn install-app-btn';btn.type='button';btn.title='تثبيت التطبيق';btn.textContent='⬇';btn.onclick=installOrbitApp;
  actions.insertBefore(btn,actions.firstChild);
  btn.style.display=deferredInstallPrompt||window.matchMedia?.('(display-mode: standalone)')?.matches?'inline-flex':'none';
}
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredInstallPrompt=event;injectInstallButton();});
window.addEventListener('appinstalled',()=>{deferredInstallPrompt=null;toast('تم تثبيت التطبيق بنجاح');});
const afterRenderV390=afterRender;
afterRender=function(){afterRenderV390();injectInstallButton();};


/* ===== v3.9.1: Branch geofencing, camera/GPS attendance proof ===== */
let faceSnapshotSession = '';
let lastLocationPreview = null;
let cameraReturnToPunch = false;

function v391DefaultBranchLocation(branch){
  const defaults={
    'القاهرة':{lat:30.0444,lng:31.2357,radius:300,address:'القاهرة',enabled:false},
    'الجيزة':{lat:30.0131,lng:31.2089,radius:300,address:'الجيزة',enabled:false},
    'الإسكندرية':{lat:31.2001,lng:29.9187,radius:300,address:'الإسكندرية',enabled:false}
  };
  const d=defaults[branch]||{};
  return {lat:Number(d.lat||state?.settings?.geofenceLat||30.0444),lng:Number(d.lng||state?.settings?.geofenceLng||31.2357),radius:Number(d.radius||state?.settings?.geofenceRadius||300),address:d.address||'',enabled:!!d.enabled};
}
function v391NormalizeState(data){
  if(!data?.settings)data.settings={};
  data.settings.verificationMode=['none','gps','camera','gps_or_camera','gps_camera'].includes(data.settings.verificationMode)?data.settings.verificationMode:((data.settings.requireGPS&&data.settings.requireFace)?'gps_camera':data.settings.requireGPS?'gps':data.settings.requireFace?'camera':'gps_or_camera');
  data.settings.geofenceMode=['warn','review','block'].includes(data.settings.geofenceMode)?data.settings.geofenceMode:'review';
  data.settings.useBranchGeofence=data.settings.useBranchGeofence!==false;
  data.settings.branchLocations=(data.settings.branchLocations&&typeof data.settings.branchLocations==='object')?data.settings.branchLocations:{};
  (data.settings.branches||[]).forEach(branch=>{
    const existing=data.settings.branchLocations[branch]||{};
    const d=v391DefaultBranchLocation(branch);
    data.settings.branchLocations[branch]={
      enabled:existing.enabled===true,
      lat:Number.isFinite(Number(existing.lat))?Number(existing.lat):d.lat,
      lng:Number.isFinite(Number(existing.lng))?Number(existing.lng):d.lng,
      radius:Math.max(10,Number(existing.radius||d.radius||300)),
      address:String(existing.address||d.address||'').trim(),
      updatedAt:existing.updatedAt||''
    };
  });
  Object.keys(data.settings.branchLocations).forEach(branch=>{if(!(data.settings.branches||[]).includes(branch))delete data.settings.branchLocations[branch]});
  (data.attendance||[]).forEach(a=>{
    if(a.distanceMeters!=null)a.distanceMeters=Math.round(Number(a.distanceMeters||0));
    if(!a.verificationStatus)a.verificationStatus=(a.geoVerified===false||a.faceVerified===false)?'needs_review':'verified';
  });
  return data;
}
const normalizeStateV390 = normalizeState;
normalizeState=function(data){return v391NormalizeState(normalizeStateV390(data))};
v391NormalizeState(state);
saveState();

function verificationModeLabel(v){return {none:'بدون إلزام',gps:'GPS فقط',camera:'كاميرا فقط',gps_or_camera:'GPS أو كاميرا',gps_camera:'GPS + كاميرا'}[v]||'GPS أو كاميرا'}
function geofenceModeLabel(v){return {warn:'السماح مع تنبيه',review:'تسجيل مع مراجعة',block:'منع التسجيل خارج النطاق'}[v]||'تسجيل مع مراجعة'}
function branchLocation(branch){
  const loc=state.settings.branchLocations?.[branch];
  if(!loc)return v391DefaultBranchLocation(branch);
  return {enabled:loc.enabled===true,lat:Number(loc.lat),lng:Number(loc.lng),radius:Math.max(10,Number(loc.radius||300)),address:loc.address||'',updatedAt:loc.updatedAt||''};
}
function branchGeofenceTarget(employee){
  const branch=employee?.branch||'';
  const loc=branch&&state.settings.useBranchGeofence!==false?branchLocation(branch):null;
  if(loc?.enabled&&Number.isFinite(loc.lat)&&Number.isFinite(loc.lng))return {branch,lat:loc.lat,lng:loc.lng,radius:loc.radius,address:loc.address||branch,isBranch:true};
  return {branch:branch||'المقر',lat:Number(state.settings.geofenceLat||30.0444),lng:Number(state.settings.geofenceLng||31.2357),radius:Number(state.settings.geofenceRadius||300),address:'المقر العام',isBranch:false};
}
function branchLocationStatusHTML(branch){
  const loc=branchLocation(branch);
  if(!loc.enabled)return `<span class="badge badge-warning">غير مفعل</span>`;
  return `<span class="badge badge-success">مفعل · ${Math.round(loc.radius)}م</span>`;
}
function branchLocationCards(){
  return getBranches().map(branch=>{const loc=branchLocation(branch),employees=state.employees.filter(e=>e.branch===branch).length;return `<article class="branch-location-card">
    <div class="branch-location-head"><div><strong>${escapeHTML(branch)}</strong><small>${employees} موظف · ${branchCurrencyLabel(branch)}</small></div>${branchLocationStatusHTML(branch)}</div>
    <div class="branch-location-meta"><span>خط العرض: <b>${Number(loc.lat||0).toFixed(6)}</b></span><span>خط الطول: <b>${Number(loc.lng||0).toFixed(6)}</b></span><span>النطاق: <b>${Math.round(loc.radius||0)}م</b></span></div>
    <div class="small muted">${escapeHTML(loc.address||'لم يتم إدخال عنوان وصفي')}</div>
    <div class="actions"><button class="btn btn-secondary btn-sm" type="button" onclick="openBranchLocationModal('${encodeURIComponent(branch)}')">تعديل الموقع</button>${loc.enabled?`<button class="btn btn-secondary btn-sm" type="button" onclick="openBranchMap('${encodeURIComponent(branch)}')">فتح الخريطة</button>`:''}</div>
  </article>`}).join('')||'<div class="empty">أضف الفروع أولًا من إعدادات المنشأة.</div>';
}

renderSettingsPolicies=function(s){
  s=state.settings;
  return `<div class="settings-panel">${settingsPanelHeader('◷','سياسات الحضور والرواتب','إعداد قواعد ساعات العمل، إثبات الكاميرا وGPS، وربط كل فرع بموقع تسجيل مستقل.')}
  <form class="card settings-section-card" onsubmit="saveSettings(event)">
    <div class="settings-subsection"><div class="settings-subsection-title"><span>💳</span><div><strong>سياسات احتساب الرواتب</strong><small>الحساب المرتبط بالراتب يعتمد على ساعات الوردية الفعلية لكل شهر</small></div></div><div class="form-grid">
      ${field('أيام العمل الافتراضية عند عدم وجود وردية','workDays',s.workDays,'number',true)}
      <div class="field"><label>احتساب خصم التأخير</label><select class="select" name="lateDeductionMethod"><option value="salary" ${s.lateDeductionMethod==='salary'?'selected':''}>من أجر الدقيقة حسب الراتب والوردية</option><option value="fixed" ${s.lateDeductionMethod==='fixed'?'selected':''}>قيمة ثابتة لكل دقيقة</option></select></div>
      ${field('قيمة دقيقة التأخير الثابتة','lateDeductionPerMinute',s.lateDeductionPerMinute,'number',true)}
      <div class="field"><label>احتساب العمل الإضافي</label><select class="select" name="overtimeCalculationMethod"><option value="salary" ${s.overtimeCalculationMethod==='salary'?'selected':''}>أجر الساعة من الراتب × معامل إضافي</option><option value="fixed" ${s.overtimeCalculationMethod==='fixed'?'selected':''}>قيمة ثابتة لكل ساعة</option></select></div>
      ${field('معامل العمل الإضافي','overtimeMultiplier',s.overtimeMultiplier||1.5,'number',true)}${field('قيمة ساعة الإضافي الثابتة','overtimeRatePerHour',s.overtimeRatePerHour,'number',true)}
      <div class="field"><label>احتساب الشهر الجاري افتراضيًا</label><select class="select" name="currentMonthPayrollMode"><option value="to_date" ${s.currentMonthPayrollMode==='to_date'?'selected':''}>حتى اليوم — استحقاق نسبي</option><option value="full" ${s.currentMonthPayrollMode==='full'?'selected':''}>الشهر كاملًا</option></select></div>
    </div></div>
    <div class="settings-subsection"><div class="settings-subsection-title"><span>📍</span><div><strong>سياسات تسجيل الحضور من الموبايل</strong><small>اختر طريقة التحقق عند تسجيل الدخول والخروج من الموظف</small></div></div><div class="form-grid">
      <div class="field"><label>طريقة التحقق</label><select class="select" name="verificationMode"><option value="none" ${s.verificationMode==='none'?'selected':''}>بدون إلزام</option><option value="gps" ${s.verificationMode==='gps'?'selected':''}>GPS فقط</option><option value="camera" ${s.verificationMode==='camera'?'selected':''}>كاميرا فقط</option><option value="gps_or_camera" ${s.verificationMode==='gps_or_camera'?'selected':''}>GPS أو كاميرا</option><option value="gps_camera" ${s.verificationMode==='gps_camera'?'selected':''}>GPS + كاميرا</option></select><div class="help">الكاميرا هنا تحفظ لقطة تحقق داخل السجل، والـGPS يتحقق من نطاق الفرع.</div></div>
      <div class="field"><label>التعامل مع خارج نطاق الفرع</label><select class="select" name="geofenceMode"><option value="warn" ${s.geofenceMode==='warn'?'selected':''}>السماح مع تنبيه</option><option value="review" ${s.geofenceMode==='review'?'selected':''}>تسجيل مع مراجعة</option><option value="block" ${s.geofenceMode==='block'?'selected':''}>منع التسجيل خارج النطاق</option></select></div>
      <div class="field"><label>استخدام موقع الفرع</label><select class="select" name="useBranchGeofence"><option value="true" ${s.useBranchGeofence!==false?'selected':''}>نعم، كل موظف حسب فرعه</option><option value="false" ${s.useBranchGeofence===false?'selected':''}>لا، استخدم موقع المقر العام</option></select></div>
      ${field('نطاق المقر العام بالمتر','geofenceRadius',s.geofenceRadius,'number',true)}${field('خط عرض المقر العام','geofenceLat',s.geofenceLat,'number',true)}${field('خط طول المقر العام','geofenceLng',s.geofenceLng,'number',true)}
      <input type="hidden" name="requireGPS" value="${['gps','gps_or_camera','gps_camera'].includes(s.verificationMode)?'true':'false'}"><input type="hidden" name="requireFace" value="${['camera','gps_or_camera','gps_camera'].includes(s.verificationMode)?'true':'false'}">
    </div><div class="notice settings-notice">عند تفعيل موقع الفرع، موظف فرع القاهرة مثلًا يتم قياسه على موقع فرع القاهرة وليس المقر العام.</div></div>
    <button class="btn btn-primary settings-save-btn">حفظ سياسات الحضور والرواتب</button>
  </form>
  <div class="card settings-section-card branch-location-settings"><div class="card-title"><div><h3>مواقع الفروع ونطاق التسجيل</h3><div class="small muted">حدد إحداثيات كل فرع ونطاق السماح بالمتر. يمكن استخدام موقعك الحالي لتعبئة الإحداثيات.</div></div><span class="settings-count">${getBranches().length} فروع</span></div><div class="branch-location-list">${branchLocationCards()}</div></div>
  <div class="settings-tip"><span>💡</span><div><strong>ملاحظة مهمة للموبايل</strong><p>الكاميرا واللوكيشن يعملان من HTTPS أو localhost فقط. عند الرفع على المتاجر يجب تشغيل التطبيق من دومين آمن وربط الصلاحيات في Android/iOS.</p><button class="link-btn" type="button" onclick="go('settings')">مركز الجاهزية ←</button></div></div>
  </div>`;
};

saveSettings=function(e){
  e.preventDefault();
  const o=Object.fromEntries(new FormData(e.target).entries());
  ['workDays','lateDeductionPerMinute','overtimeMultiplier','overtimeRatePerHour','geofenceRadius','geofenceLat','geofenceLng'].forEach(k=>{if(k in o)o[k]=Number(o[k])});
  if('verificationMode' in o){
    o.verificationMode=['none','gps','camera','gps_or_camera','gps_camera'].includes(o.verificationMode)?o.verificationMode:'gps_or_camera';
    o.requireGPS=['gps','gps_or_camera','gps_camera'].includes(o.verificationMode);
    o.requireFace=['camera','gps_or_camera','gps_camera'].includes(o.verificationMode);
  }else{ o.requireFace=o.requireFace==='true';o.requireGPS=o.requireGPS==='true'; }
  if('geofenceMode' in o)o.geofenceMode=['warn','review','block'].includes(o.geofenceMode)?o.geofenceMode:'review';
  if('useBranchGeofence' in o)o.useBranchGeofence=o.useBranchGeofence==='true';
  state.settings={...state.settings,...o};
  v391NormalizeState(state);logAudit('تعديل الإعدادات','الإعدادات','سياسات الحضور والرواتب والمواقع');saveState();render();toast('تم حفظ الإعدادات')
};

function openBranchLocationModal(encodedBranch){
  const branch=decodeURIComponent(encodedBranch),loc=branchLocation(branch);
  openModal(`موقع فرع ${branch}`,`<form id="branchLocationForm" class="form-grid"><input type="hidden" name="branch" value="${escapeHTML(branch)}">
    <div class="field"><label>تفعيل موقع الفرع</label><select class="select" name="enabled"><option value="true" ${loc.enabled?'selected':''}>مفعل</option><option value="false" ${!loc.enabled?'selected':''}>غير مفعل</option></select></div>
    <div class="field"><label>العنوان الوصفي</label><input class="input" name="address" value="${escapeHTML(loc.address||'')}" placeholder="مثال: مكتب القاهرة - شارع ..."></div>
    <div class="field"><label>خط العرض Latitude</label><input class="input" name="lat" type="number" step="0.000001" value="${Number(loc.lat||0)}" required></div>
    <div class="field"><label>خط الطول Longitude</label><input class="input" name="lng" type="number" step="0.000001" value="${Number(loc.lng||0)}" required></div>
    <div class="field"><label>نطاق السماح بالمتر</label><input class="input" name="radius" type="number" min="10" step="10" value="${Math.round(loc.radius||300)}" required></div>
    <div class="field full"><div class="notice">يمكنك الضغط على زر «استخدام موقعي الحالي» وأنت داخل الفرع لتعبئة الإحداثيات تلقائيًا.</div></div>
    <div class="field full"><button class="btn btn-secondary" type="button" onclick="fillBranchLocationFromCurrentPosition()">📍 استخدام موقعي الحالي</button> <button class="btn btn-secondary" type="button" onclick="previewBranchLocationFromForm()">فتح الموقع على الخريطة</button></div>
  </form>`,saveBranchLocation,'حفظ موقع الفرع');
}
function saveBranchLocation(){
  const form=$('#branchLocationForm');if(!form?.reportValidity())return;
  const f=Object.fromEntries(new FormData(form).entries()),branch=f.branch;
  const lat=Number(f.lat),lng=Number(f.lng),radius=Math.max(10,Number(f.radius||300));
  if(!Number.isFinite(lat)||lat<-90||lat>90)return toast('خط العرض غير صحيح','error');
  if(!Number.isFinite(lng)||lng<-180||lng>180)return toast('خط الطول غير صحيح','error');
  state.settings.branchLocations=state.settings.branchLocations||{};
  state.settings.branchLocations[branch]={enabled:f.enabled==='true',lat,lng,radius,address:String(f.address||'').trim(),updatedAt:new Date().toISOString()};
  logAudit('تعديل موقع فرع','الإعدادات',`${branch} · ${lat},${lng} · ${Math.round(radius)}م`);saveState();closeModal();render();toast('تم حفظ موقع الفرع')
}
function fillBranchLocationFromCurrentPosition(){
  if(!navigator.geolocation)return toast('المتصفح لا يدعم GPS','error');
  toast('جاري تحديد موقعك...');
  navigator.geolocation.getCurrentPosition(p=>{const form=$('#branchLocationForm');if(!form)return;form.elements.lat.value=p.coords.latitude.toFixed(6);form.elements.lng.value=p.coords.longitude.toFixed(6);toast('تم وضع إحداثيات موقعك الحالي')},()=>toast('تعذر الحصول على الموقع. تأكد من السماح للمتصفح باللوكيشن','error'),{enableHighAccuracy:true,timeout:12000,maximumAge:0});
}
function previewBranchLocationFromForm(){
  const f=$('#branchLocationForm');if(!f)return;const lat=Number(f.elements.lat.value),lng=Number(f.elements.lng.value);if(!Number.isFinite(lat)||!Number.isFinite(lng))return toast('الإحداثيات غير صحيحة','error');window.open(`https://www.google.com/maps?q=${lat},${lng}`,'_blank','noopener')
}
function openBranchMap(encodedBranch){const branch=decodeURIComponent(encodedBranch),loc=branchLocation(branch);if(!loc.enabled)return toast('فعّل موقع الفرع أولًا','error');window.open(`https://www.google.com/maps?q=${loc.lat},${loc.lng}`,'_blank','noopener')}

function gpsRequiredForMode(mode=state.settings.verificationMode){return ['gps','gps_camera'].includes(mode)}
function cameraRequiredForMode(mode=state.settings.verificationMode){return ['camera','gps_camera'].includes(mode)}
function gpsAcceptedForMode(mode=state.settings.verificationMode){return ['gps','gps_or_camera','gps_camera'].includes(mode)}
function cameraAcceptedForMode(mode=state.settings.verificationMode){return ['camera','gps_or_camera','gps_camera'].includes(mode)}

getLocation=function(employee=ownEmployee()){
  return new Promise((resolve,reject)=>{
    if(!navigator.geolocation)return reject(new Error('unsupported'));
    const target=branchGeofenceTarget(employee);
    navigator.geolocation.getCurrentPosition(p=>{
      const lat=p.coords.latitude,lng=p.coords.longitude,d=distanceMeters(lat,lng,target.lat,target.lng),verified=d<=target.radius;
      resolve({lat,lng,accuracy:p.coords.accuracy,available:true,verified,distanceMeters:Math.round(d),branch:target.branch,targetLat:target.lat,targetLng:target.lng,radius:target.radius,isBranch:target.isBranch,label:`${lat.toFixed(5)}, ${lng.toFixed(5)} — ${Math.round(d)}م من ${target.isBranch?'فرع '+target.branch:'المقر العام'}`});
    },reject,{enableHighAccuracy:true,timeout:12000,maximumAge:15000})
  })
};

function branchProofHTML(employee,record){
  const target=branchGeofenceTarget(employee),locStatus=target.isBranch?`موقع فرع ${escapeHTML(target.branch)}`:'موقع المقر العام';
  const dist=record?.distanceMeters!=null?`${Math.round(record.distanceMeters)}م`:'';
  const ok=record?.geoVerified===true;
  return `<div class="punch-proof-card ${ok?'ok':'warn'}"><span>📍</span><div><strong>${locStatus}</strong><small>النطاق ${Math.round(target.radius)}م ${dist?`· آخر قياس ${dist}`:''}</small></div></div>`;
}
function openPunchPanel(){
  const me=ownEmployee(),today=state.attendance.find(a=>a.employeeId===me?.id&&a.date===todayISO()),target=branchGeofenceTarget(me),mode=state.settings.verificationMode||'gps_or_camera';
  openModal('تسجيل الحضور والانصراف',`<div class="punch-modal"><div class="small muted">الوقت الحالي</div><div class="live-clock" id="liveClock">--:--:--</div><div class="today-date">${new Intl.DateTimeFormat('ar-EG',{weekday:'long',day:'numeric',month:'long'}).format(new Date())}</div>
    <div class="punch-status-grid"><div><span>الدخول</span><strong>${fmtTime(today?.checkIn)}</strong></div><div><span>الخروج</span><strong>${fmtTime(today?.checkOut)}</strong></div><div><span>التأخير</span><strong>${minutesToHM(today?.lateMinutes||0)}</strong></div><div><span>الإضافي</span><strong>${minutesToHM(today?.overtimeMinutes||0)}</strong></div></div>
    <div class="punch-proof-summary"><div class="punch-proof-card"><span>🔐</span><div><strong>${verificationModeLabel(mode)}</strong><small>سياسة خارج النطاق: ${geofenceModeLabel(state.settings.geofenceMode)}</small></div></div>${branchProofHTML(me,today)}<div class="punch-proof-card ${faceVerifiedSession?'ok':'warn'}"><span>📷</span><div><strong>إثبات الكاميرا ${faceVerifiedSession?'تم':'غير مكتمل'}</strong><small>${cameraAcceptedForMode(mode)?'متاح لهذا التسجيل':'غير مطلوب حاليًا'}</small></div></div></div>
    <div class="punch-actions"><button class="btn btn-success" onclick="punch('in')" ${today?.checkIn?'disabled':''}>✓ تسجيل دخول</button><button class="btn btn-danger" onclick="punch('out')" ${!today?.checkIn||today?.checkOut?'disabled':''}>↪ تسجيل خروج</button></div>
    <div class="punch-actions secondary"><button class="btn btn-secondary btn-sm" onclick="checkPunchLocationPreview()">📍 فحص موقعي الآن</button><button class="btn btn-secondary btn-sm" onclick="openCamera(true)">📷 إثبات الكاميرا ${faceVerifiedSession?'✓':''}</button>${canAdmin()?`<button class="btn btn-secondary btn-sm" onclick="openBranchLocationModal('${encodeURIComponent(me?.branch||'')}')">⚙ موقع الفرع</button>`:''}</div>
    <div class="small muted">${target.isBranch?`الموظف مرتبط بفرع ${escapeHTML(target.branch)}؛ سيتم التحقق من هذا الموقع.`:'لا يوجد موقع فرع مفعل؛ سيتم استخدام موقع المقر العام.'}</div>
  </div>`);startClock();
}
async function checkPunchLocationPreview(){
  const me=ownEmployee();try{toast('جاري فحص الموقع...');const loc=await getLocation(me);lastLocationPreview=loc;openModal('نتيجة فحص الموقع',`<div class="location-check-result ${loc.verified?'ok':'warn'}"><h3>${loc.verified?'داخل النطاق المسموح':'خارج النطاق المسموح'}</h3><p>${escapeHTML(loc.label)}</p><div class="grid grid-2">${infoCard('الفرع / الهدف',loc.isBranch?`فرع ${loc.branch}`:'المقر العام')}${infoCard('المسافة',`${loc.distanceMeters} متر`)}${infoCard('النطاق المسموح',`${loc.radius} متر`)}${infoCard('السياسة',geofenceModeLabel(state.settings.geofenceMode))}</div><button class="btn btn-secondary" onclick="window.open('https://www.google.com/maps?q=${loc.lat},${loc.lng}','_blank','noopener')">فتح موقعي على الخريطة</button></div>`,()=>openPunchPanel(),'رجوع للتسجيل')}catch{toast('تعذر الحصول على الموقع. اسمح للمتصفح باستخدام اللوكيشن','error')}
}

openCamera=function(returnToPunch=false){
  cameraReturnToPunch=!!returnToPunch;
  openModal('إثبات الكاميرا',`<div class="camera-box"><video id="cameraVideo" autoplay playsinline></video><canvas id="cameraCanvas" class="hidden"></canvas></div><div class="camera-note">سيتم حفظ لقطة تحقق مصغرة داخل سجل الحضور. المطابقة البيومترية الحقيقية تحتاج خادمًا آمنًا وموافقة واضحة من الموظف.</div>`,captureFace,'التقاط والتحقق');
  if(!navigator.mediaDevices?.getUserMedia){toast('هذا المتصفح لا يدعم تشغيل الكاميرا','error');return;}
  navigator.mediaDevices.getUserMedia({video:{facingMode:'user'},audio:false}).then(s=>{cameraStream=s;$('#cameraVideo').srcObject=s}).catch(()=>toast('تعذر تشغيل الكاميرا. تأكد من السماح للمتصفح بالكاميرا','error'))
};
captureFace=function(){
  const v=$('#cameraVideo'),c=$('#cameraCanvas');if(!v||!v.videoWidth)return toast('الكاميرا غير جاهزة','error');
  c.width=Math.min(640,v.videoWidth);c.height=Math.round(c.width*(v.videoHeight/v.videoWidth));c.getContext('2d').drawImage(v,0,0,c.width,c.height);
  faceSnapshotSession=c.toDataURL('image/jpeg',0.72);faceVerifiedSession=true;stopCamera();closeModal();toast('تم التقاط صورة إثبات الحضور');if(cameraReturnToPunch){cameraReturnToPunch=false;setTimeout(openPunchPanel,80)}else render();
};

function attendanceVerificationResult(loc,hasCamera){
  const mode=state.settings.verificationMode||'gps_or_camera',geoOK=!!loc?.verified,geoAvailable=!!loc?.available;
  if(mode==='none')return {ok:true,status:'verified',note:'لا يوجد تحقق إلزامي'};
  if(mode==='camera')return {ok:hasCamera,status:hasCamera?'verified':'needs_review',note:hasCamera?'تم إثبات الكاميرا':'الكاميرا مطلوبة'};
  if(mode==='gps')return {ok:geoAvailable&&(geoOK||state.settings.geofenceMode!=='block'),status:geoOK?'verified':'needs_review',note:geoOK?'داخل نطاق الفرع':'خارج نطاق الفرع'};
  if(mode==='gps_camera')return {ok:hasCamera&&geoAvailable&&(geoOK||state.settings.geofenceMode!=='block'),status:(hasCamera&&geoOK)?'verified':'needs_review',note:`${hasCamera?'كاميرا ✓':'كاميرا مطلوبة'} · ${geoOK?'داخل النطاق':'خارج النطاق'}`};
  const ok=hasCamera||geoOK||(geoAvailable&&state.settings.geofenceMode!=='block');
  return {ok,status:(hasCamera||geoOK)?'verified':'needs_review',note:hasCamera?'تم إثبات الكاميرا':geoOK?'داخل نطاق الفرع':'خارج نطاق الفرع'};
}

punch=async function(type){
  const e=ownEmployee(); if(!e)return toast('لا يوجد ملف موظف مرتبط بالحساب','error');
  const mode=state.settings.verificationMode||'gps_or_camera';
  let loc={label:'غير متاح',available:false,verified:false,lat:null,lng:null,distanceMeters:null,branch:e.branch,radius:branchGeofenceTarget(e).radius};
  if(gpsAcceptedForMode(mode)){
    try{loc=await getLocation(e)}catch(err){if(gpsRequiredForMode(mode))return toast('تعذر التحقق من الموقع، ولا يمكن تسجيل الحضور','error')}
  }
  const hasCamera=!!faceVerifiedSession;
  if(cameraRequiredForMode(mode)&&!hasCamera)return toast('يجب إثبات الكاميرا أولًا','error');
  if(gpsRequiredForMode(mode)&&!loc.available)return toast('يجب السماح باللوكيشن أولًا','error');
  if(loc.available&&!loc.verified&&state.settings.geofenceMode==='block'&&gpsAcceptedForMode(mode)&&!hasCamera)return toast(`أنت خارج نطاق فرع ${e.branch}. المسافة الحالية ${loc.distanceMeters}م، والنطاق ${loc.radius}م`,'error');
  const verify=attendanceVerificationResult(loc,hasCamera);
  if(!verify.ok)return toast(verify.note||'التحقق غير مكتمل','error');
  const record=state.attendance.find(a=>a.employeeId===e.id&&a.date===todayISO());
  if(type==='in'){
    if(record?.checkIn)return toast('تم تسجيل الدخول بالفعل','error');
    const now=new Date(), sh=shift(e.shiftId), late=calculateLate(now,sh);
    state.attendance.push({id:uid('a'),employeeId:e.id,branch:e.branch,date:todayISO(),checkIn:now.toISOString(),checkOut:null,lateMinutes:late,overtimeMinutes:0,earlyLeaveMinutes:0,workShortageMinutes:late,status:late>0?'late':'present',location:loc.label,faceVerified:hasCamera,faceImage:faceSnapshotSession||'',geoVerified:!!loc.verified,coords:{lat:loc.lat,lng:loc.lng},distanceMeters:loc.distanceMeters,targetRadius:loc.radius,targetBranch:loc.branch,verificationStatus:verify.status,verificationNote:verify.note,verificationMode:mode,source:'mobile',createdAt:new Date().toISOString()});
    toast(verify.status==='needs_review'?'تم تسجيل الدخول مع وضعه للمراجعة':'تم تسجيل الدخول بنجاح');
  }else{
    if(!record?.checkIn)return toast('سجّل الدخول أولًا','error'); if(record.checkOut)return toast('تم تسجيل الخروج بالفعل','error');
    const now=new Date();record.checkOut=now.toISOString();record.overtimeMinutes=calculateOvertime(now,shift(e.shiftId),record.date);record.earlyLeaveMinutes=calculateEarlyLeave(now,shift(e.shiftId),record.date);record.workShortageMinutes=Number(record.lateMinutes||0)+Number(record.earlyLeaveMinutes||0);record.checkOutLocation=loc.label;record.checkOutCoords={lat:loc.lat,lng:loc.lng};record.checkOutGeoVerified=!!loc.verified;record.checkOutDistanceMeters=loc.distanceMeters;record.checkOutFaceVerified=hasCamera;record.checkOutFaceImage=faceSnapshotSession||'';record.checkOutVerificationStatus=verify.status;record.checkOutVerificationNote=verify.note;record.updatedAt=new Date().toISOString();
    if(verify.status==='needs_review')record.verificationStatus='needs_review';
    toast(verify.status==='needs_review'?'تم تسجيل الخروج مع وضعه للمراجعة':'تم تسجيل الخروج بنجاح');
  }
  faceVerifiedSession=false;faceSnapshotSession='';saveState();closeModal();render();
};

attendanceIssue=function(a){if(!a)return '';if(a.status==='absent')return 'absent';if(a.verificationStatus==='needs_review'||a.checkOutVerificationStatus==='needs_review')return 'unverified';if(a.checkIn&&!a.checkOut)return 'missingOut';if(Number(a.lateMinutes||0)>0)return 'late';if(Number(a.overtimeMinutes||0)>0)return 'overtime';if(a.faceVerified===false||a.geoVerified===false)return 'unverified';return 'ok'};
attendanceIssueLabel=function(v){return {missingOut:'خروج غير مسجل',late:'تأخير',overtime:'إضافي',unverified:'تحقق / موقع يحتاج مراجعة',absent:'غياب',ok:'سليم'}[v]||''};

const renderAttendanceV391Base=renderAttendance;
renderAttendance=function(){
  normalizeAllAttendanceRecords();
  const ids=visibleEmployees().map(e=>e.id);
  const records=state.attendance.filter(a=>ids.includes(a.employeeId)).sort(attendanceSort);
  const employeeOptions=visibleEmployees().map(e=>`<option value="${e.id}">${escapeHTML(e.name)} — ${escapeHTML(e.code||'')}</option>`).join('');
  const branchOptions=getBranches().map(b=>`<option value="${escapeHTML(b)}">${escapeHTML(b)}</option>`).join('');
  const todayRecords=records.filter(a=>a.date===todayISO());
  return `<div class="attendance-manager">
    <section class="attendance-banner"><div class="attendance-banner-title"><span class="attendance-banner-icon">♟◷</span><div><h2>إدارة سجلات الحضور</h2><p>تسجيل حضور باللوكيشن أو الكاميرا مع ربط كل موظف بموقع فرعه.</p></div></div><div class="attendance-banner-actions">${ownEmployee()?'<button class="att-top-btn att-punch" onclick="openPunchPanel()">◷ تسجيل حضوري</button>':''}${canManage()?'<button class="att-top-btn att-manual" onclick="manualAttendanceModal()">＋ إضافة سجل يدوي</button><button class="att-top-btn att-import" onclick="importAttendanceModal()">▣ استيراد حضور</button><button class="att-top-btn att-auto" onclick="generateAbsenceModal()">☑ توليد الغياب</button>':''}<button class="att-top-btn att-report" onclick="go('reports')">⌁ التقارير</button></div></section>
    <section class="attendance-insights no-print" id="attendanceInsights">${attendanceInsightsHTML(todayRecords)}</section>
    <section class="attendance-filter-card no-print"><div class="attendance-filter-grid att-grid-7"><div class="att-filter-field"><label>الموظف</label><select class="select" id="attEmployee" onchange="filterAttendanceRows()"><option value="">جميع الموظفين</option>${employeeOptions}</select></div><div class="att-filter-field"><label>من تاريخ</label><input class="input" id="attFrom" type="date" value="${todayISO()}" onchange="filterAttendanceRows()"></div><div class="att-filter-field"><label>إلى تاريخ</label><input class="input" id="attTo" type="date" value="${todayISO()}" onchange="filterAttendanceRows()"></div><div class="att-filter-field"><label>الحالة</label><select class="select" id="attStatus" onchange="filterAttendanceRows()"><option value="">جميع الحالات</option><option value="present">حاضر</option><option value="late">متأخر</option><option value="absent">غائب</option></select></div><div class="att-filter-field"><label>ملاحظة</label><select class="select" id="attIssue" onchange="filterAttendanceRows()"><option value="">كل السجلات</option><option value="missingOut">خروج غير مسجل</option><option value="late">تأخير</option><option value="overtime">إضافي</option><option value="unverified">تحقق / موقع يحتاج مراجعة</option><option value="absent">غياب</option></select></div><div class="att-filter-field"><label>الفرع</label><select class="select" id="attBranch" onchange="filterAttendanceRows()"><option value="">جميع الفروع</option>${branchOptions}</select></div><div class="att-filter-field"><label>عدد السجلات</label><select class="select" id="attLimit" onchange="filterAttendanceRows()"><option value="15">15</option><option value="25">25</option><option value="50">50</option><option value="100">100</option><option value="all">الكل</option></select></div></div><div class="attendance-filter-footer"><div class="att-search-actions"><button class="att-square-btn att-reset" title="إعادة تعيين" onclick="clearAttendanceFilters()">×</button><button class="att-square-btn att-search" title="بحث" onclick="filterAttendanceRows()">⌕</button><span class="att-result-count" id="attVisibleCount">${records.length} سجل</span></div><div class="att-export-actions"><button class="att-export-btn excel" onclick="exportAttendance()">▣ تصدير Excel</button><button class="att-export-btn pdf" onclick="printAttendancePDF()">▤ تصدير PDF</button></div></div></section>
    <section class="attendance-table-card">${attendanceTable(records,true)}</section>
  </div>`;
};

attendanceRow=function(a){
  const e=emp(a.employeeId)||{},sh=shift(e.shiftId),plan=shiftDaySchedule(sh,a.date),source=a.source||(a.location==='إدخال يدوي'?'manual':'mobile'),missingOut=attendanceIssue(a)==='missingOut',workMinutes=attendanceActualMinutes(a),shiftLabel=plan?`${plan.start} — ${plan.end}`:'راحة',sourceText=source==='auto'?'☑ توليد تلقائي':source==='manual'?'⌨ تسجيل يدوي':'▣ تطبيق الجوال',sourceClass=source==='auto'?'source-auto':source==='manual'?'source-manual':'source-mobile';
  const verifyBadge=a.verificationStatus==='needs_review'||a.checkOutVerificationStatus==='needs_review'?'<span class="verify-pill warn">مراجعة</span>':'<span class="verify-pill ok">موثق</span>';
  return `<tr data-record-id="${a.id}" data-id="${a.id}" data-date="${a.date}" data-status="${a.status}" data-issue="${attendanceIssue(a)}" data-employee="${a.employeeId}" data-branch="${escapeHTML(e.branch||'')}"><td class="check-col"><input class="att-row-check" type="checkbox" aria-label="تحديد السجل"></td><td><div class="employee-cell att-employee">${avatarHTML(e,36)}<div><strong>${escapeHTML(e.name||'-')}</strong><small>${escapeHTML(e.code||'')} · ${escapeHTML(e.department||'-')}</small></div></div></td><td><span class="att-date">${escapeHTML(a.date)} <span>▦</span></span></td><td><span class="att-shift-pill">${escapeHTML(shiftLabel)}</span></td><td>${a.checkIn?`<span class="time-pill time-in">↪ ${fmtTime(a.checkIn)}</span>`:'<span class="muted">—</span>'}</td><td>${missingOut?'<span class="time-pill time-missing">◷ لم يسجل خروج</span>':(a.checkOut?`<span class="time-pill time-out">↩ ${fmtTime(a.checkOut)}</span>`:'<span class="muted">—</span>')}</td><td><span class="att-mini-pill ${workMinutes?'ok':'muted'}">${workMinutes?minutesToHM(workMinutes):'—'}</span></td><td><span class="att-mini-pill ${Number(a.lateMinutes||0)>0?'warn':'muted'}">${Number(a.lateMinutes||0)>0?minutesToHM(a.lateMinutes):'—'}</span></td><td><span class="att-mini-pill ${Number(a.overtimeMinutes||0)>0?'ok':'muted'}">${Number(a.overtimeMinutes||0)>0?minutesToHM(a.overtimeMinutes):'—'}</span></td><td>${e.branch?`<span class="branch-pill">▣ ${escapeHTML(e.branch)}</span>`:'<span class="muted">—</span>'}</td><td>${statusBadge(a.status)} ${verifyBadge}</td><td><span class="source-pill ${sourceClass}">${sourceText}</span><div class="small muted">${verificationModeLabel(a.verificationMode||state.settings.verificationMode)}</div></td><td><div class="att-location-stack">${a.location&&a.location!=='إدخال يدوي'&&a.location!=='غياب تلقائي'?`<button class="map-pill map-in" onclick="showAttendanceLocation('${a.id}','in')">● حضور ${a.distanceMeters!=null?Math.round(a.distanceMeters)+'م':''}</button>`:'<span class="att-location-muted">حضور —</span>'}${a.checkOutLocation?`<button class="map-pill map-out" onclick="showAttendanceLocation('${a.id}','out')">● خروج ${a.checkOutDistanceMeters!=null?Math.round(a.checkOutDistanceMeters)+'م':''}</button>`:'<span class="att-location-muted">خروج —</span>'}</div></td><td><div class="att-row-actions"><button class="mini-action view" title="عرض" onclick="viewAttendance('${a.id}')">◉</button>${canManage()?`<button class="mini-action edit" title="تعديل" onclick="editAttendanceModal('${a.id}')">✎</button><button class="mini-action delete" title="حذف" onclick="deleteAttendance('${a.id}')">■</button>`:''}</div></td></tr>`;
};

viewAttendance=function(id){
  const a=state.attendance.find(x=>x.id===id),e=emp(a?.employeeId),sh=shift(e?.shiftId),plan=shiftDaySchedule(sh,a?.date);if(!a)return;
  const faceIn=a.faceImage?`<div class="attendance-face-preview"><img src="${a.faceImage}" alt="لقطة حضور"></div>`:'';
  const faceOut=a.checkOutFaceImage?`<div class="attendance-face-preview"><img src="${a.checkOutFaceImage}" alt="لقطة خروج"></div>`:'';
  openModal('تفاصيل سجل الحضور',`<div class="employee-cell" style="margin-bottom:18px">${avatarHTML(e,58)}<div><h3 style="margin:0 0 5px">${escapeHTML(e?.name||'-')}</h3><div class="muted">${escapeHTML(e?.code||'')} — ${escapeHTML(e?.branch||'-')}</div></div></div><div class="grid grid-2">${infoCard('التاريخ',a.date)}${infoCard('الحالة',({present:'حاضر',late:'متأخر',absent:'غائب'}[a.status]||a.status))}${infoCard('الوردية',plan?`${plan.start} — ${plan.end}`:'راحة / غير محددة')}${infoCard('ساعات العمل الفعلية',minutesToHM(attendanceActualMinutes(a)))}${infoCard('وقت الدخول',fmtTime(a.checkIn))}${infoCard('وقت الخروج',fmtTime(a.checkOut))}${infoCard('موقع الحضور',a.location||'-')}${infoCard('موقع الانصراف',a.checkOutLocation||'-')}${infoCard('مسافة الحضور عن الفرع',a.distanceMeters!=null?`${Math.round(a.distanceMeters)} متر`:'-')}${infoCard('مسافة الخروج عن الفرع',a.checkOutDistanceMeters!=null?`${Math.round(a.checkOutDistanceMeters)} متر`:'-')}${infoCard('التأخير',`${a.lateMinutes||0} دقيقة`)}${infoCard('العمل الإضافي',`${a.overtimeMinutes||0} دقيقة`)}${infoCard('إثبات الكاميرا',a.faceVerified||a.checkOutFaceVerified?'تم':'لم يتم')}${infoCard('التحقق بالموقع',a.geoVerified||a.checkOutGeoVerified?'تم':'لم يتم')}${infoCard('حالة التحقق',a.verificationStatus==='needs_review'||a.checkOutVerificationStatus==='needs_review'?'يحتاج مراجعة':'موثق')}${infoCard('ملاحظة التحقق',a.verificationNote||a.checkOutVerificationNote||'-')}</div>${faceIn||faceOut?`<div class="grid grid-2" style="margin-top:16px">${faceIn}${faceOut}</div>`:''}`)
};

exportAttendance=function(){
  const r=filteredAttendanceRecords();
  const rows=r.map(a=>{const e=emp(a.employeeId),plan=shiftDaySchedule(shift(e?.shiftId),a.date),source=a.source==='auto'?'توليد تلقائي':(a.source==='manual'||a.location==='إدخال يدوي')?'تسجيل يدوي':'تطبيق الجوال';return [e?.code||'',e?.name||'',e?.branch||'',e?.department||'',a.date,plan?`${plan.start} - ${plan.end}`:'راحة',fmtTime(a.checkIn),fmtTime(a.checkOut),minutesToHM(attendanceActualMinutes(a)),a.location||'',a.distanceMeters??'',a.checkOutLocation||'',a.checkOutDistanceMeters??'',a.lateMinutes||0,a.overtimeMinutes||0,({present:'حاضر',late:'متأخر',absent:'غائب'}[a.status]||a.status),source,verificationModeLabel(a.verificationMode||state.settings.verificationMode),a.verificationStatus==='needs_review'||a.checkOutVerificationStatus==='needs_review'?'يحتاج مراجعة':'موثق',attendanceIssueLabel(attendanceIssue(a))]});
  downloadStyledExcel('orbit-attendance.xls',[{title:'الحضور والانصراف',headers:['كود الموظف','الموظف','الفرع','القسم','التاريخ','الوردية','الدخول','الخروج','ساعات العمل','موقع الحضور','مسافة الحضور م','موقع الانصراف','مسافة الخروج م','التأخير بالدقائق','الإضافي بالدقائق','الحالة','المصدر','طريقة التحقق','حالة التحقق','ملاحظة'],rows}],{title:'تقرير الحضور والانصراف',subtitle:'حسب فلاتر الحضور الحالية'})
};
printAttendancePDF=function(){const r=filteredAttendanceRecords(),headers=['كود الموظف','الموظف','الفرع','التاريخ','الدخول','الخروج','المسافة','التأخير','الإضافي','الحالة','التحقق'],rows=r.map(a=>{const e=emp(a.employeeId);return [e?.code||'',e?.name||'',e?.branch||'',a.date,fmtTime(a.checkIn),fmtTime(a.checkOut),a.distanceMeters!=null?`${Math.round(a.distanceMeters)}م`:'-',a.lateMinutes||0,a.overtimeMinutes||0,statusText(a.status),a.verificationStatus==='needs_review'||a.checkOutVerificationStatus==='needs_review'?'مراجعة':'موثق']});printBrandedPDF('تقرير الحضور والانصراف',[{title:'سجلات الحضور',headers,rows}],{subtitle:'حسب فلاتر الحضور الحالية مع توثيق الفرع واللوكيشن'})};

const professionalHealthChecksV390=professionalHealthChecks;
professionalHealthChecks=function(){
  const issues=professionalHealthChecksV390();
  if((state.settings.verificationMode||'')!=='none'){
    getBranches().forEach(b=>{const loc=branchLocation(b);if(state.settings.useBranchGeofence!==false&&!loc.enabled)addReadinessIssue(issues,'warning','مواقع الفروع',`موقع فرع ${b} غير مفعل`,'لن يتم التحقق من حضور موظفي هذا الفرع حسب موقع الفرع.','الإعدادات ← الحضور والرواتب ← مواقع الفروع')});
    if(!window.isSecureContext&&location.hostname!=='localhost')addReadinessIssue(issues,'warning','الحضور الجوال','الكاميرا واللوكيشن يحتاجان HTTPS','لن تعمل صلاحيات GPS/Camera على الموبايل بدون HTTPS.','انشر التطبيق على دومين آمن');
  }
  return issues;
};


const normalizeAllAttendanceRecordsV401Base=normalizeAllAttendanceRecords;
normalizeAllAttendanceRecords=function(){(state.attendance||[]).forEach(a=>{if(a&&!a._normalizedV401){normalizeAttendanceRecord(a);a._normalizedV401=true}})};



/* Orbit HR v4.2 production attendance bridge */
const orbitLegacyPunch = punch;
punch = async function(type){
  if(!orbitToken()) return orbitLegacyPunch(type);
  const e=ownEmployee();
  if(!e) return toast('لا يوجد ملف موظف مرتبط بالحساب','error');
  let lat=null,lng=null,image=faceSnapshotSession||'';
  try{
    const loc=await getLocation(e);
    lat=loc.lat; lng=loc.lng;
  }catch(err){}
  try{
    const r=await orbitApi('/api/attendance/punch',{method:'POST',body:JSON.stringify({employeeId:e.id,type:type==='out'?'checkOut':'checkIn',lat,lng,cameraImage:image,faceVerified:!!image})});
    if(r?.item){
      const old=state.attendance.find(a=>a.id===r.item.id);
      if(old) Object.assign(old,r.item); else state.attendance.push(r.item);
      saveState(); render();
    }
    faceVerifiedSession=false;faceSnapshotSession='';closeModal();toast('تم تسجيل الحضور من السيرفر');
  }catch(err){toast(err?.message||'تعذر تسجيل الحضور','error')}
};

window.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});
if('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
window.addEventListener('hashchange',()=>{const v=String(location.hash||'').replace(/^#\/?/,'').trim();if(v&&v!==currentView){currentView=v;render()}});
render();

/* ================================
   Orbit HR v4.3 Production Backend Sync
   ================================ */
const ORBIT_TOKEN_KEY='orbit_hr_api_token_v4';
var orbitServerStatus='checking';
var orbitSaveTimer=null;
var orbitLastServerSave='';
var orbitBootPulled=false;

function orbitToken(){try{return sessionStorage.getItem(ORBIT_TOKEN_KEY)||''}catch{return ''}}
async function orbitApi(path,options={}){
  const headers=Object.assign({'Content-Type':'application/json'},options.headers||{});
  const token=orbitToken(); if(token)headers.Authorization=`Bearer ${token}`;
  const res=await fetch(path,Object.assign({},options,{headers}));
  const ct=res.headers.get('content-type')||'';
  const payload=ct.includes('application/json')?await res.json():await res.text();
  if(!res.ok){const err=new Error(payload?.message||payload?.error||`HTTP ${res.status}`);err.payload=payload;throw err}
  return payload;
}
function orbitSetServerStatus(status,label=''){
  orbitServerStatus=status;
  const el=document.getElementById('orbitServerBadge');
  if(el){el.className=`orbit-server-badge ${status}`;el.innerHTML=`<span></span>${escapeHTML(label||orbitServerStatusText())}`}
}
function orbitServerStatusText(){return orbitServerStatus==='online'?'متصل بالسيرفر':orbitServerStatus==='saving'?'جاري الحفظ على السيرفر':orbitServerStatus==='offline'?'تشغيل محلي - السيرفر غير متاح':'فحص اتصال السيرفر'}
function orbitInstallServerBadge(){
  if(document.getElementById('orbitServerBadge'))return;
  document.body.insertAdjacentHTML('beforeend',`<div id="orbitServerBadge" class="orbit-server-badge checking"><span></span>فحص اتصال السيرفر</div>`);
}
async function orbitPullServerState(silent=false){
  try{
    orbitSetServerStatus('checking','فحص اتصال السيرفر');
    const data=await orbitApi('/api/state',{method:'GET'});
    if(data?.ok&&data.state){
      const localText=localStorage.getItem(APP_KEY)||'';
      const cleanState=sanitizeClientState(data.state);
      const serverText=JSON.stringify(cleanState);
      if(serverText&&serverText!==localText){state=normalizeState(cleanState);storeClientState();if(currentUser){const u=state.users.find(x=>x.id===currentUser.id||String(x.email||'').toLowerCase()===String(currentUser.email||'').toLowerCase());if(u)saveSession({...u,serverAuthenticated:currentUser.serverAuthenticated})}render();}
      orbitBootPulled=true;orbitLastServerSave=data.updatedAt||'';orbitSetServerStatus('online','متصل بالسيرفر');
      if(!silent)toast('تم تحميل بيانات السيرفر');
      return true;
    }
  }catch(err){
    if(err&&err.payload&&err.payload.error==='auth_required'){
      orbitSetServerStatus('online','السيرفر متصل - سجّل الدخول');
      return false;
    }
    orbitSetServerStatus('offline','تشغيل محلي - السيرفر غير متاح');return false;}
  return false;
}
function orbitScheduleServerSave(){
  if(typeof fetch!=='function'||!orbitToken())return;
  // Only the admin may push the full application state. Other roles use granular APIs below.
  if(currentUser?.role!=='admin')return;
  clearTimeout(orbitSaveTimer);
  orbitSaveTimer=setTimeout(()=>orbitPushServerState(),650);
}
async function orbitPushServerState(){
  if(currentUser?.role!=='admin')return toast('حفظ حالة النظام بالكامل متاح لمسؤول النظام فقط؛ باقي العمليات تحفظ عبر APIs منفصلة','error');
  try{
    orbitSetServerStatus('saving','جاري الحفظ على السيرفر');
    const data=await orbitApi('/api/state',{method:'PUT',body:JSON.stringify({state:sanitizeClientState(state),clientVersion:APP_VERSION})});
    if(data?.ok){orbitLastServerSave=data.updatedAt||new Date().toISOString();orbitSetServerStatus('online','تم الحفظ على السيرفر');}
  }catch(err){orbitSetServerStatus('offline','لم يتم حفظ حالة النظام على السيرفر');}
}
async function orbitCreateServerBackup(){
  try{const r=await orbitApi('/api/backup',{method:'POST',body:JSON.stringify({})});toast(r?.backup?.filename?`تم إنشاء نسخة سيرفر: ${r.backup.filename}`:'تم إنشاء نسخة سيرفر');orbitAfterRenderEnhancements();}
  catch(err){toast('تعذر إنشاء نسخة على السيرفر','error')}
}
function orbitDownloadServerBackup(){
  const token=encodeURIComponent(orbitToken());
  window.open(`/api/export-state${token?`?token=${token}`:''}`,'_blank');
}
async function orbitRunServerQuality(){
  try{
    const r=await orbitApi('/api/quality',{method:'GET'});
    const items=(r.issues||[]).map(i=>`<tr><td>${escapeHTML(i.area)}</td><td>${typeof issueBadge==='function'?issueBadge(i.level):escapeHTML(i.level)}</td><td><strong>${escapeHTML(i.title)}</strong><div class="small muted">${escapeHTML(i.details)}</div></td><td>${escapeHTML(i.fix||'-')}</td></tr>`).join('');
    openModal('فحص جودة السيرفر',`<div class="table-wrap"><table><thead><tr><th>المنطقة</th><th>المستوى</th><th>المشكلة</th><th>الإجراء</th></tr></thead><tbody>${items}</tbody></table></div>`);
  }catch(err){toast('تعذر تشغيل فحص السيرفر','error')}
}
async function orbitShowServerAudit(){
  try{
    const r=await orbitApi('/api/audit',{method:'GET'});
    const rows=(r.items||[]).slice(0,80).map(x=>`<tr><td>${fmtDate(String(x.created_at||'').slice(0,10))}</td><td>${escapeHTML(x.actor_email||'-')}</td><td>${escapeHTML(x.action||'')}</td><td>${escapeHTML(x.area||'')}</td><td>${escapeHTML(x.details||'')}</td></tr>`).join('');
    openModal('سجل السيرفر',`<div class="table-wrap"><table><thead><tr><th>التاريخ</th><th>المستخدم</th><th>الإجراء</th><th>القسم</th><th>التفاصيل</th></tr></thead><tbody>${rows}</tbody></table></div>`);
  }catch(err){toast('تعذر فتح سجل السيرفر','error')}
}
async function orbitHealthModal(){
  try{
    const r=await orbitApi('/api/health',{method:'GET'});
    const cards=Object.entries(r.counts||{}).map(([k,v])=>infoCard(k,v)).join('');
    openModal('حالة السيرفر وقاعدة البيانات',`<div class="grid grid-2">${infoCard('الإصدار',r.version)}${infoCard('قاعدة البيانات',r.database)}${infoCard('آخر تحديث',r.updatedAt)}${infoCard('وقت السيرفر',r.serverTime)}</div><div class="grid grid-3" style="margin-top:14px">${cards}</div>`);
  }catch(err){toast('السيرفر غير متاح حاليًا','error')}
}
function orbitAfterRenderEnhancements(){
  orbitInstallServerBadge();
  if(currentView==='settings'&&settingsActiveGroup==='system'){
    const panel=document.querySelector('.settings-panel');
    if(panel&&!document.getElementById('orbitServerTools')){
      panel.insertAdjacentHTML('afterbegin',`<div id="orbitServerTools" class="card settings-section-card orbit-server-tools"><div class="card-title"><div><h3>Orbit HR v4.3 Production Backend</h3><div class="small muted">قاعدة بيانات SQLite منظمة، API منفصل لكل عملية، صلاحيات من السيرفر، احتساب رواتب وحضور من السيرفر، نسخ احتياطي وسجل مركزي.</div></div><span class="badge badge-success">Server Ready</span></div><div class="server-tools-grid"><button class="btn btn-primary" type="button" onclick="orbitPullServerState()">↻ تحميل من السيرفر</button><button class="btn btn-primary" type="button" onclick="orbitPushServerState()">⇧ حفظ على السيرفر</button><button class="btn btn-secondary" type="button" onclick="orbitCreateServerBackup()">نسخة احتياطية سيرفر</button><button class="btn btn-secondary" type="button" onclick="orbitDownloadServerBackup()">تحميل Backup سيرفر</button><button class="btn btn-secondary" type="button" onclick="orbitRunServerQuality()">فحص جودة السيرفر</button><button class="btn btn-secondary" type="button" onclick="orbitShowServerAudit()">سجل السيرفر</button><button class="btn btn-secondary" type="button" onclick="orbitHealthModal()">حالة قاعدة البيانات</button></div><div class="notice settings-notice">v4.3 أضافت إصلاح دورة الحضور من وقت السيرفر، منع تفريغ سجلات الخروج، حماية الملفات، إزالة كلمات المرور، مزامنة آمنة، وتوحيد أكبر لدورة الرواتب والطلبات.</div></div>`)
    }
  }
}


/* ================================
   Orbit HR v4.2 security API bindings
   ================================ */
function orbitMergeItem(key,item){
  if(!item)return;
  state[key]=Array.isArray(state[key])?state[key]:[];
  const i=state[key].findIndex(x=>x.id===item.id);
  if(i>=0)state[key][i]=item;else state[key].push(item);
  storeClientState();
}
async function orbitRefreshSection(key,path){
  try{const r=await orbitApi(path,{method:'GET'});if(r?.ok&&Array.isArray(r.items)){state[key]=r.items;storeClientState();render();}}catch(e){}
}
punch=async function(type){
  const e=ownEmployee(); if(!e)return toast('لا يوجد ملف موظف مرتبط بالحساب','error');
  const mode=state.settings.verificationMode||'gps_or_camera';
  let loc={label:'غير متاح',available:false,verified:false,lat:null,lng:null,accuracy:null,distanceMeters:null,branch:e.branch,radius:branchGeofenceTarget(e).radius};
  if(gpsAcceptedForMode(mode)){try{loc=await getLocation(e)}catch(err){if(gpsRequiredForMode(mode))return toast('تعذر التحقق من الموقع، ولا يمكن تسجيل الحضور','error')}}
  const hasCamera=!!faceSnapshotSession;
  if(cameraRequiredForMode(mode)&&!hasCamera)return toast('يجب التقاط صورة إثبات بالكاميرا أولًا','error');
  if(gpsRequiredForMode(mode)&&!loc.available)return toast('يجب السماح باللوكيشن أولًا','error');
  try{
    orbitSetServerStatus('saving','جاري تسجيل الحضور على السيرفر');
    const r=await orbitApi('/api/attendance/punch',{method:'POST',body:JSON.stringify({
      type:type==='out'?'checkOut':'checkIn',employeeId:e.id,lat:loc.lat,lng:loc.lng,accuracy:loc.accuracy,location:loc.label,
      cameraImage:faceSnapshotSession||'',faceVerified:false
    })});
    orbitMergeItem('attendance',r.item);faceVerifiedSession=false;faceSnapshotSession='';closeModal();render();orbitSetServerStatus('online','تم حفظ الحضور على السيرفر');toast(type==='out'?'تم تسجيل الخروج من السيرفر':'تم تسجيل الدخول من السيرفر');
  }catch(err){toast(err?.payload?.message||err.message||'تعذر تسجيل الحضور على السيرفر','error');orbitSetServerStatus('offline','فشل حفظ الحضور')}
};
saveEditedAttendance=async function(){
  const f=Object.fromEntries(new FormData($('#editAttForm')).entries()),a=state.attendance.find(x=>x.id===f.id);if(!a)return;
  const payload={employeeId:f.employeeId,date:f.date,checkIn:combineAttendanceDateTime(f.date,f.checkIn),checkOut:combineAttendanceDateTime(f.date,f.checkOut),status:f.status==='absent'?'absent':'present',location:f.location||'إدخال يدوي',checkOutLocation:f.checkOutLocation||'',source:'manual'};
  try{const r=await orbitApi(`/api/attendance/${encodeURIComponent(f.id)}`,{method:'PUT',body:JSON.stringify(payload)});orbitMergeItem('attendance',r.item);closeModal();render();toast('تم تعديل سجل الحضور على السيرفر')}
  catch(err){toast(err?.payload?.details?.join('، ')||err?.payload?.message||'تعذر حفظ سجل الحضور','error')}
};
saveManualAttendance=async function(){
  const f=Object.fromEntries(new FormData($('#manualAttForm')).entries());
  const payload={employeeId:f.employeeId,date:f.date,checkIn:combineAttendanceDateTime(f.date,f.checkIn),checkOut:combineAttendanceDateTime(f.date,f.checkOut),status:f.status==='absent'?'absent':'present',location:f.location||'إدخال يدوي',checkOutLocation:f.checkOutLocation||'',source:'manual'};
  try{const r=await orbitApi('/api/attendance',{method:'POST',body:JSON.stringify(payload)});orbitMergeItem('attendance',r.item);closeModal();render();toast('تمت إضافة سجل الحضور على السيرفر')}
  catch(err){toast(err?.payload?.details?.join('، ')||err?.payload?.message||'تعذر إضافة سجل الحضور','error')}
};
deleteAttendance=async function(id){if(!confirm('هل تريد حذف سجل الحضور؟'))return;try{await orbitApi(`/api/attendance/${encodeURIComponent(id)}`,{method:'DELETE'});state.attendance=state.attendance.filter(a=>a.id!==id);storeClientState();render();toast('تم حذف السجل من السيرفر')}catch(err){toast('تعذر حذف السجل','error')}};
saveLeave=async function(id=''){
  const form=$('#leaveForm'),fd=new FormData(form),o=Object.fromEntries(fd.entries());if(!o.employeeId)o.employeeId=currentUser.employeeId;const a=new Date(o.from),b=new Date(o.to);o.days=Math.floor((b-a)/86400000)+1;if(o.days<1)return toast('الفترة غير صحيحة','error');const t=leaveTypeInfo(o.leaveTypeId);o.type=t.name;o.paid=t.paid;
  try{let r;if(id){r=await orbitApi(`/api/leaves/${encodeURIComponent(id)}`,{method:'PUT',body:JSON.stringify(o)})}else{r=await orbitApi('/api/leaves',{method:'POST',body:JSON.stringify(o)})}orbitMergeItem('leaves',r.item);closeModal();render();toast(id?'تم تعديل طلب الإجازة على السيرفر':'تم إرسال طلب الإجازة للسيرفر')}
  catch(err){toast(err?.payload?.message||err?.payload?.details?.join('، ')||'تعذر حفظ طلب الإجازة','error')}
};
saveMission=async function(){const o=Object.fromEntries(new FormData($('#missionForm')).entries());if(!o.employeeId)o.employeeId=currentUser.employeeId;try{const r=await orbitApi('/api/missions',{method:'POST',body:JSON.stringify(o)});orbitMergeItem('missions',r.item);closeModal();render();toast('تم إرسال طلب المأمورية للسيرفر')}catch(err){toast(err?.payload?.message||'تعذر إرسال طلب المأمورية','error')}};
setRequestStatus=async function(type,id,status){const key=type==='leave'?'leaves':'missions',path=type==='leave'?'leaves':'missions';try{const r=await orbitApi(`/api/${path}/${encodeURIComponent(id)}/status`,{method:'PUT',body:JSON.stringify({status})});orbitMergeItem(key,r.item);render();toast(`تم تحديث الحالة إلى ${statusText(status)}`)}catch(err){toast(err?.payload?.message||'تعذر تغيير حالة الطلب','error')}};
deleteRequest=async function(type,id){const key=type==='leave'?'leaves':'missions',path=type==='leave'?'leaves':'missions';try{await orbitApi(`/api/${path}/${encodeURIComponent(id)}`,{method:'DELETE'});state[key]=state[key].filter(x=>x.id!==id);storeClientState();render();toast('تم إلغاء الطلب من السيرفر')}catch(err){toast('تعذر إلغاء الطلب','error')}};
generatePayroll=async function(month,mode='auto',branch='',employeeIds=null){
  if(!/^\d{4}-\d{2}$/.test(month))return toast('اختر شهرًا صحيحًا','error');if(!branch)return toast('اختر فرعًا صحيحًا','error');
  try{const r=await orbitApi('/api/payroll/calculate',{method:'POST',body:JSON.stringify({month,branch,employeeIds:Array.isArray(employeeIds)?employeeIds:[],mode})});(r.items||[]).forEach(x=>orbitMergeItem('payroll',x));render();toast(`تم احتساب رواتب ${(r.items||[]).length} موظف على السيرفر${(r.skipped||[]).length?` وتخطي ${(r.skipped||[]).length}`:''}`)}
  catch(err){toast(err?.payload?.message||'تعذر احتساب الرواتب على السيرفر','error')}
};
setPayrollStatus=async function(id,status){try{const r=await orbitApi(`/api/payroll/${encodeURIComponent(id)}/status`,{method:'PUT',body:JSON.stringify({status})});orbitMergeItem('payroll',r.item);render();toast(`تم تحديث الحالة إلى ${statusText(status)} على السيرفر`)}catch(err){toast(err?.payload?.message||'تعذر تحديث حالة الراتب','error')}};

window.addEventListener('load',()=>{orbitInstallServerBadge();orbitPullServerState(true);});

/* =========================================================
   Orbit HR v4.2.0 secure client integration
   ========================================================= */
function sanitizeClientState(input){
  const clean=JSON.parse(JSON.stringify(input||{}));
  clean.users=Array.isArray(clean.users)?clean.users.map(u=>{const x={...u};delete x.password;delete x.passwordHash;delete x.password_hash;delete x._pendingPassword;return x}):[];
  return clean;
}
function cacheClientState(){
  try{localStorage.setItem(APP_KEY,JSON.stringify(sanitizeClientState(state)))}catch{}
}

saveState=function(){
  state=normalizeState(sanitizeClientState(state));
  cacheClientState();
  if(orbitToken())orbitScheduleServerSave();
};

login=async function(e){
  e.preventDefault();
  const email=$('#loginEmail').value.trim().toLowerCase(),password=$('#loginPassword').value;
  const btn=e?.target?.querySelector('button');if(btn){btn.disabled=true;btn.textContent='جاري تسجيل الدخول...'}
  try{
    const remote=await orbitApi('/api/login',{method:'POST',body:JSON.stringify({email,password})});
    if(!remote?.ok)throw new Error('تعذر تسجيل الدخول');
    sessionStorage.setItem(ORBIT_TOKEN_KEY,remote.token||'');
    orbitLastServerSave=remote.updatedAt||'';
    state=normalizeState(sanitizeClientState(remote.state||{}));cacheClientState();
    const remoteUser=remote.user||{};saveSession({...remoteUser,serverAuthenticated:true});
    currentView='dashboard';saveView(currentView);render();orbitSetServerStatus('online','متصل بالسيرفر');
    toast('تم تسجيل الدخول بنجاح');
    if(remoteUser.mustChangePassword)setTimeout(()=>showChangePasswordModal(true),120);
  }catch(err){
    orbitSetServerStatus('offline','تعذر الاتصال الآمن بالسيرفر');
    toast(err?.payload?.message||'تعذر تسجيل الدخول. يجب تشغيل السيرفر والاتصال به؛ تم إلغاء الدخول المحلي غير الآمن.','error');
    if(btn){btn.disabled=false;btn.textContent='تسجيل الدخول'}
  }
};

function showChangePasswordModal(required=false){
  openModal(required?'تغيير كلمة المرور مطلوب':'تغيير كلمة المرور',`<form id="changePasswordForm" class="form-grid"><div class="field full"><label>كلمة المرور الحالية</label><input class="input" type="password" name="currentPassword" autocomplete="current-password" required></div><div class="field full"><label>كلمة المرور الجديدة</label><input class="input" type="password" name="newPassword" minlength="10" autocomplete="new-password" required><div class="help">10 أحرف على الأقل وتحتوي حروفًا وأرقامًا.</div></div><div class="field full"><label>تأكيد كلمة المرور</label><input class="input" type="password" name="confirmPassword" minlength="10" autocomplete="new-password" required></div></form>`,async()=>{
    const f=$('#changePasswordForm');if(!f?.reportValidity())return false;
    const currentPassword=f.elements.currentPassword.value,newPassword=f.elements.newPassword.value,confirmPassword=f.elements.confirmPassword.value;
    if(newPassword!==confirmPassword)return toast('تأكيد كلمة المرور غير مطابق','error');
    try{await orbitApi('/api/change-password',{method:'POST',body:JSON.stringify({currentPassword,newPassword})});currentUser.mustChangePassword=false;saveSession(currentUser);closeModal();toast('تم تغيير كلمة المرور بنجاح')}catch(err){toast(err?.payload?.message||'تعذر تغيير كلمة المرور','error')}
  },'حفظ كلمة المرور');
  if(required){const cancel=$('.modal .btn-secondary');if(cancel)cancel.style.display='none'}
}

orbitPullServerState=async function(silent=false){
  try{
    orbitSetServerStatus('checking','فحص اتصال السيرفر');
    const data=await orbitApi('/api/state',{method:'GET'});
    if(data?.ok&&data.state){state=normalizeState(sanitizeClientState(data.state));cacheClientState();orbitBootPulled=true;orbitLastServerSave=data.updatedAt||'';orbitSetServerStatus('online','متصل بالسيرفر');render();if(!silent)toast('تم تحميل أحدث بيانات السيرفر');return true}
  }catch(err){if(err?.payload?.error==='auth_required'){orbitSetServerStatus('online','السيرفر متصل - سجّل الدخول');return false}orbitSetServerStatus('offline','السيرفر غير متاح');}
  return false;
};

orbitPushServerState=async function(){
  if(!orbitToken())return;
  try{
    orbitSetServerStatus('saving','جاري حفظ التغييرات');
    const data=await orbitApi('/api/sync',{method:'PUT',body:JSON.stringify({state:sanitizeClientState(state),baseUpdatedAt:orbitLastServerSave,clientVersion:APP_VERSION})});
    if(data?.ok){orbitLastServerSave=data.updatedAt||orbitLastServerSave;if(data.state){state=normalizeState(sanitizeClientState(data.state));cacheClientState()}orbitSetServerStatus('online','تم الحفظ على السيرفر');}
  }catch(err){
    if(err?.payload?.error==='sync_conflict'){
      if(err.payload.state){state=normalizeState(sanitizeClientState(err.payload.state));orbitLastServerSave=err.payload.updatedAt||'';cacheClientState();render()}
      orbitSetServerStatus('online','تعارض بيانات - تم تحميل الأحدث');toast('تم تعديل البيانات من مستخدم آخر، لذلك أوقف النظام الحفظ وحمّل أحدث نسخة لمنع فقد البيانات. أعد تنفيذ التعديل.','error');return;
    }
    orbitSetServerStatus('offline','لم يتم حفظ التغيير');toast(err?.payload?.message||'تعذر حفظ التغيير على السيرفر','error');
  }
};

orbitDownloadServerBackup=async function(){
  try{
    const headers={Authorization:`Bearer ${orbitToken()}`};const res=await fetch('/api/export-state',{headers});if(!res.ok)throw new Error('download_failed');
    const blob=await res.blob(),cd=res.headers.get('content-disposition')||'',m=cd.match(/filename\*=UTF-8''([^;]+)/),name=m?decodeURIComponent(m[1]):`orbit_hr_backup_${todayISO()}.zip`;
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }catch{toast('تعذر تنزيل النسخة الاحتياطية','error')}
};

saveEmployee=async function(id){
  const form=$('#employeeForm');if(!form?.reportValidity())return;
  const value=name=>form.elements[name]?.value?.trim?.()??'';
  const payload={name:value('name'),code:value('code'),email:value('email').toLowerCase(),phone:value('phone'),department:value('department'),jobTitle:value('jobTitle'),branch:value('branch'),hireDate:value('hireDate'),salary:Number(value('salary')),shiftId:value('shiftId'),managerId:value('managerId'),status:value('status'),photo:pendingEmployeePhoto,nationalId:value('nationalId'),birthDate:value('birthDate'),gender:value('gender'),address:value('address'),emergencyName:value('emergencyName'),emergencyPhone:value('emergencyPhone'),bankName:value('bankName'),bankAccount:value('bankAccount'),insuranceNumber:value('insuranceNumber'),taxNumber:value('taxNumber'),contractType:value('contractType'),contractStart:value('contractStart'),contractEnd:value('contractEnd'),probationEnd:value('probationEnd'),insuranceDeduction:Math.max(0,Number(value('insuranceDeduction'))),taxDeduction:Math.max(0,Number(value('taxDeduction')))};
  const wantsAccount=form.elements.createAccount.checked,existingAccount=id?employeeAccount(id):null,accountEmail=value('accountEmail').toLowerCase(),accountPassword=form.elements.accountPassword?.value||'';
  if(wantsAccount&&(!existingAccount&&accountPassword.length<10))return toast('كلمة المرور المؤقتة يجب أن تكون 10 أحرف على الأقل وتحتوي حروفًا وأرقامًا','error');
  try{
    const employeeResult=await orbitApi(id?`/api/employees/${encodeURIComponent(id)}`:'/api/employees',{method:id?'PUT':'POST',body:JSON.stringify(payload)});
    const employee=employeeResult.item,employeeId=employee.id;
    let account=existingAccount;
    if(wantsAccount){
      const accountPayload={employeeId,name:payload.name,email:accountEmail,role:value('accountRole'),active:value('accountActive')==='true'};
      if(account){await orbitApi(`/api/users/${encodeURIComponent(account.id)}`,{method:'PUT',body:JSON.stringify(accountPayload)});if(accountPassword)await orbitApi(`/api/users/${encodeURIComponent(account.id)}/password`,{method:'PUT',body:JSON.stringify({password:accountPassword,mustChangePassword:true})})}
      else{const r=await orbitApi('/api/users',{method:'POST',body:JSON.stringify({...accountPayload,password:accountPassword,mustChangePassword:true})});account=r.item}
    }else if(account){await orbitApi(`/api/users/${encodeURIComponent(account.id)}`,{method:'DELETE'})}
    orbitLastServerSave=employeeResult.updatedAt||orbitLastServerSave;await orbitPullServerState(true);closeModal();toast('تم حفظ الموظف وحساب الدخول على السيرفر');
  }catch(err){toast(err?.payload?.message||(Array.isArray(err?.payload?.details)?err.payload.details.join('، '):'تعذر حفظ الموظف'),'error')}
};

deleteEmployee=async function(id){
  if(currentUser?.employeeId===id)return toast('لا يمكن حذف ملف المستخدم المسجل حاليًا','error');
  if(!confirm('هل تريد حذف الموظف وحساب الدخول المرتبط به؟'))return;
  try{const account=employeeAccount(id);if(account)await orbitApi(`/api/users/${encodeURIComponent(account.id)}`,{method:'DELETE'});const r=await orbitApi(`/api/employees/${encodeURIComponent(id)}`,{method:'DELETE'});orbitLastServerSave=r.updatedAt||orbitLastServerSave;await orbitPullServerState(true);toast('تم حذف الموظف وحساب الدخول')}catch(err){toast(err?.payload?.message||'تعذر حذف الموظف','error')}
};

saveLeave=async function(id=''){
  const form=$('#leaveForm'),fd=new FormData(form),o=Object.fromEntries(fd.entries());if(!o.employeeId)o.employeeId=currentUser.employeeId;
  if(id)return toast('تعديل طلب قائم يتم من مسار الحالة والمراجعة في هذه النسخة','error');
  const t=leaveTypeInfo(o.leaveTypeId);o.type=t.name;o.paid=t.paid;
  try{const r=await orbitApi('/api/leaves',{method:'POST',body:JSON.stringify(o)});orbitLastServerSave=r.updatedAt||orbitLastServerSave;await orbitPullServerState(true);closeModal();toast('تم إرسال طلب الإجازة للسيرفر')}catch(err){toast(err?.payload?.message||'تعذر إرسال طلب الإجازة','error')}
};

saveMission=async function(){
  const o=Object.fromEntries(new FormData($('#missionForm')).entries());if(!o.employeeId)o.employeeId=currentUser.employeeId;
  try{const r=await orbitApi('/api/missions',{method:'POST',body:JSON.stringify(o)});orbitLastServerSave=r.updatedAt||orbitLastServerSave;await orbitPullServerState(true);closeModal();toast('تم إرسال طلب المأمورية للسيرفر')}catch(err){toast(err?.payload?.message||'تعذر إرسال طلب المأمورية','error')}
};

saveRequestFlexibleStatus=async function(type,id){
  const form=$('#requestStatusForm');if(!form)return;const area=type==='leave'?'leaves':'missions';
  try{const r=await orbitApi(`/api/${area}/${encodeURIComponent(id)}/status`,{method:'PUT',body:JSON.stringify({status:form.elements.status.value,note:form.elements.statusNote.value.trim()})});orbitLastServerSave=r.updatedAt||orbitLastServerSave;await orbitPullServerState(true);closeModal();toast('تم تعديل حالة الطلب')}catch(err){toast(err?.payload?.message||'تعذر تعديل حالة الطلب','error')}
};

generatePayroll=async function(month,mode='auto',branch='',employeeIds=null){
  if(!/^\d{4}-\d{2}$/.test(month))return toast('اختر شهرًا صحيحًا','error');
  try{const r=await orbitApi('/api/payroll/calculate',{method:'POST',body:JSON.stringify({month,mode,branch,employeeIds:Array.isArray(employeeIds)?employeeIds:[]})});orbitLastServerSave=r.updatedAt||orbitLastServerSave;await orbitPullServerState(true);toast(`تم احتساب رواتب ${r.items?.length||0} موظف من السيرفر${r.skipped?.length?` مع تخطي ${r.skipped.length} سجل نهائي`:''}`)}catch(err){toast(err?.payload?.message||'تعذر احتساب الرواتب','error')}
};

setPayrollStatus=async function(id,status){
  try{const r=await orbitApi(`/api/payroll/${encodeURIComponent(id)}/status`,{method:'PUT',body:JSON.stringify({status})});orbitLastServerSave=r.updatedAt||orbitLastServerSave;await orbitPullServerState(true);toast(`تم تحديث الحالة إلى ${statusText(status)}`)}catch(err){toast(err?.payload?.message||'تعذر تحديث حالة الراتب','error')}
};

punch=async function(type){
  const e=ownEmployee();if(!e)return toast('لا يوجد ملف موظف مرتبط بالحساب','error');
  const mode=state.settings.verificationMode||'gps_or_camera';let loc={label:'غير متاح',available:false,verified:false,lat:null,lng:null,accuracy:null};
  if(gpsAcceptedForMode(mode)){try{loc=await getLocation(e)}catch{if(gpsRequiredForMode(mode))return toast('تعذر الحصول على موقع دقيق','error')}}
  if(cameraRequiredForMode(mode)&&!faceSnapshotSession)return toast('لقطة الكاميرا مطلوبة كدليل للتسجيل','error');
  try{
    const r=await orbitApi('/api/attendance/punch',{method:'POST',body:JSON.stringify({type:type==='out'?'checkOut':'checkIn',employeeId:e.id,lat:loc.lat,lng:loc.lng,accuracy:loc.accuracy||loc.coords?.accuracy||null,mocked:false,location:loc.label,cameraImage:faceSnapshotSession||''})});
    orbitLastServerSave=r.updatedAt||orbitLastServerSave;await orbitPullServerState(true);faceVerifiedSession=false;faceSnapshotSession='';closeModal();toast(type==='out'?'تم تسجيل الخروج من وقت السيرفر':'تم تسجيل الحضور من وقت السيرفر');
  }catch(err){toast(err?.payload?.message||'تعذر تسجيل الحضور','error')}
};

const _professionalHealthChecksV42Base=professionalHealthChecks;
professionalHealthChecks=function(){
  const issues=_professionalHealthChecksV42Base().filter(i=>!String(i?.title||'').includes('كلمة مرور ضعيفة'));
  if(!orbitToken())addReadinessIssue(issues,'error','الأمان','لا توجد جلسة سيرفر آمنة','تم تعطيل الدخول المحلي. يجب تسجيل الدخول من السيرفر.','شغّل server.py وسجّل الدخول بالحساب المؤقت');
  return issues;
};

/* v4.2 account-permission persistence and personal UI preferences */
assignEmployeePermission=async function(){
  const employeeId=$('#permissionEmployeeSelect')?.value,role=$('#permissionRoleSelect')?.value||'employee',active=$('#permissionAccountActive')?.value==='true',e=emp(employeeId),u=employeeAccount(employeeId);
  if(!e)return toast('اختر الموظف أولًا','error');if(!u)return toast('هذا الموظف ليس لديه حساب دخول','error');
  const permissions=selectedPermissionValues($('#employeePermissionChecks')||document);if(!permissions.length)return toast('حدد صلاحية واحدة على الأقل','error');
  if(u.id===currentUser?.id&&(role!=='admin'||!active||!permissions.includes('settings')))return toast('لا يمكن إلغاء صلاحية مسؤول النظام الحالي','error');
  try{const r=await orbitApi(`/api/users/${encodeURIComponent(u.id)}`,{method:'PUT',body:JSON.stringify({employeeId,name:e.name,email:u.email,role,active,permissions})});orbitLastServerSave=r.updatedAt||orbitLastServerSave;await orbitPullServerState(true);toast('تم حفظ صلاحيات الموظف على السيرفر')}catch(err){toast(err?.payload?.message||'تعذر حفظ الصلاحيات','error')}
};

savePermissionGroupEditor=async function(id){
  const p=permissionProfile(id);if(!p)return toast('المجموعة غير موجودة','error');
  const name=String($('#permissionGroupName')?.value||'').trim(),permissions=selectedPermissionValues($('#permissionGroupPermissionChecks')||document);if(!name||!permissions.length)return toast('أدخل الاسم وحدد الصلاحيات','error');
  const selectedEmployees=$$('#permissionGroupEmployees .permission-employee-group-check:checked').map(x=>x.value);p.name=name;p.permissions=permissions;
  try{
    for(const u of state.users.filter(x=>x.employeeId&&x.id!==currentUser?.id)){
      const shouldAssign=selectedEmployees.includes(u.employeeId),nextRole=shouldAssign?id:(u.role===id?'employee':u.role);
      if(nextRole!==u.role){const r=await orbitApi(`/api/users/${encodeURIComponent(u.id)}`,{method:'PUT',body:JSON.stringify({employeeId:u.employeeId,name:u.name,email:u.email,role:nextRole,active:u.active!==false,permissions:[]})});orbitLastServerSave=r.updatedAt||orbitLastServerSave}
    }
    await orbitPushServerState();await orbitPullServerState(true);toast('تم حفظ مجموعة الصلاحيات وتعيينات الموظفين')
  }catch(err){toast(err?.payload?.message||'تعذر حفظ مجموعة الصلاحيات','error')}
};

const _orbitPushServerStatePrefs=orbitPushServerState;
orbitPushServerState=async function(){
  const prefs={theme:state.settings?.theme,language:state.settings?.language};
  await _orbitPushServerStatePrefs();
  state.settings=state.settings||{};if(prefs.theme)state.settings.theme=prefs.theme;if(prefs.language)state.settings.language=prefs.language;cacheClientState();
};
