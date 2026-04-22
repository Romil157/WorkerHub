import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Wrench, User, Phone, Mail, CreditCard, Shield, FileText, CheckSquare, ArrowRight, ArrowLeft, Upload, ChevronDown, MapPin, Loader } from 'lucide-react';
import api from '../../services/api';
import useAuthStore from '../../store/authStore';
import { getCurrentCity } from '../../services/geolocation';

const STEPS = [
  { id: 1, label: 'Basic Info', icon: <User size={18} /> },
  { id: 2, label: 'Aadhar', icon: <Shield size={18} /> },
  { id: 3, label: 'Skills', icon: <Wrench size={18} /> },
  { id: 4, label: 'Bank Details', icon: <CreditCard size={18} /> },
  { id: 5, label: 'Insurance', icon: <FileText size={18} /> },
  { id: 6, label: 'T & C', icon: <CheckSquare size={18} /> },
];

const SKILLS_LIST = ['Plumbing', 'Electrical Work', 'Carpentry', 'Painting', 'AC Repair', 'House Cleaning', 'Pest Control', 'Gardening', 'Home Appliance Repair', 'Welding', 'Bathroom Renovation', 'Roofing'];
const INSURANCE_PROVIDERS = ['ICICI General', 'Bajaj Allianz', 'HDFC ERGO', 'New India Assurance', 'Star Health', 'National Insurance', 'Other'];

const step1Schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().regex(/^\+?[6-9]\d{9}$/, 'Enter valid 10-digit Indian mobile number'),
  email: z.string().email('Enter valid email address'),
  dateOfBirth: z.string().refine(d => { const age = (new Date() - new Date(d)) / (365.25 * 24 * 3600 * 1000); return age >= 18; }, 'Must be at least 18 years old'),
  gender: z.enum(['M', 'F', 'Other']),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  city: z.string().min(2, 'Enter your city'),
});

const FormField = ({ label, error, hint, children }) => (
  <div className="form-group">
    <label className="form-label">{label}</label>
    {children}
    {error && <span className="form-error">⚠ {error}</span>}
    {hint && !error && <span className="form-hint">{hint}</span>}
  </div>
);

const StepIndicator = ({ currentStep }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 40, overflowX: 'auto', padding: '0 8px' }}>
    {STEPS.map((step, i) => (
      <div key={step.id} style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 70
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: currentStep > step.id ? 'var(--color-forest)' : currentStep === step.id ? 'var(--color-rust)' : 'var(--color-border)',
            color: currentStep >= step.id ? '#fff' : 'var(--color-subtle)',
            fontWeight: 700, fontSize: '0.85rem', transition: 'all 0.3s ease', flexShrink: 0,
          }}>
            {currentStep > step.id ? '✓' : step.id}
          </div>
          <span style={{ fontSize: '0.7rem', color: currentStep === step.id ? 'var(--color-rust)' : 'var(--color-subtle)', fontWeight: currentStep === step.id ? 600 : 400, textAlign: 'center' }}>
            {step.label}
          </span>
        </div>
        {i < STEPS.length - 1 && (
          <div style={{ width: 40, height: 2, background: currentStep > step.id ? 'var(--color-forest)' : 'var(--color-border)', marginBottom: 20, transition: 'background 0.3s ease' }} />
        )}
      </div>
    ))}
  </div>
);

// Step 1 Component
const Step1 = ({ onNext }) => {
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(step1Schema) });
  const { setUser } = useAuthStore();
  const [geoLoading, setGeoLoading] = useState(false);

  const handleGeoFill = async () => {
    setGeoLoading(true);
    try {
      const { city } = await getCurrentCity();
      if (city) {
        setValue('city', city, { shouldValidate: true });
        toast.success(`📍 City detected: ${city}`);
      } else {
        toast.error('Could not detect city. Please type it manually.');
      }
    } catch (err) {
      toast.error(err.message || 'Location access denied.');
    }
    setGeoLoading(false);
  };

  const onSubmit = async (data) => {
    try {
      const res = await api.post('/auth/register', { ...data, userType: 'worker' });
      setUser(res.data.data.user, res.data.data.accessToken, res.data.data.refreshToken);
      toast.success('Account created! Continue with verification.');
      onNext({ userId: res.data.data.user._id });
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Registration failed. Please try again.';
      toast.error(msg);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <FormField label="Full Name (as per Aadhar)" error={errors.name?.message}>
          <input className={`form-input ${errors.name ? 'error' : ''}`} placeholder="John Doe" {...register('name')} />
        </FormField>
        <FormField label="Phone Number" error={errors.phone?.message} hint="10-digit Indian mobile number">
          <input className={`form-input ${errors.phone ? 'error' : ''}`} placeholder="+919876543210" {...register('phone')} />
        </FormField>
        <FormField label="Email Address" error={errors.email?.message}>
          <input type="email" className={`form-input ${errors.email ? 'error' : ''}`} placeholder="john@example.com" {...register('email')} />
        </FormField>
        <FormField label="Password" error={errors.password?.message} hint="At least 8 characters">
          <input type="password" className={`form-input ${errors.password ? 'error' : ''}`} placeholder="••••••••" {...register('password')} />
        </FormField>
        <FormField label="Date of Birth" error={errors.dateOfBirth?.message} hint="Must be 18+">
          <input type="date" className={`form-input ${errors.dateOfBirth ? 'error' : ''}`} {...register('dateOfBirth')} />
        </FormField>
        <FormField label="Gender" error={errors.gender?.message}>
          <select className={`form-select ${errors.gender ? 'error' : ''}`} {...register('gender')}>
            <option value="">Select Gender</option>
            <option value="M">Male</option>
            <option value="F">Female</option>
            <option value="Other">Other</option>
          </select>
        </FormField>
        <div style={{ gridColumn: '1 / -1' }}>
          <FormField label="City of Operation" error={errors.city?.message}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className={`form-input ${errors.city ? 'error' : ''}`} placeholder="Bangalore" {...register('city')} style={{ flex: 1 }} />
              <button type="button" onClick={handleGeoFill} disabled={geoLoading}
                style={{ padding: '0 14px', borderRadius: 10, border: '1px solid var(--color-border)', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-forest)', flexShrink: 0 }}
                title="Use my current location">
                {geoLoading ? <Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <MapPin size={15} />} {geoLoading ? '' : '📍'}
              </button>
            </div>
          </FormField>
        </div>
      </div>
      <button type="submit" className="btn btn--primary btn--full btn--lg" style={{ marginTop: 32 }} disabled={isSubmitting}>
        {isSubmitting ? <><span className="spinner spinner--white" style={{ width: 18, height: 18 }} /> Creating Account...</> : <>Continue <ArrowRight size={18} /></>}
      </button>
    </form>
  );
};

// Step 2 — Aadhar
const Step2 = ({ onNext, onBack }) => {
  const [aadharNumber, setAadharNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [frontFile, setFrontFile] = useState(null);
  const [backFile, setBackFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!frontFile || !backFile) { toast.error('Please upload both Aadhar front and back photos'); return; }
    const cleaned = aadharNumber.replace(/\s/g, '');
    if (!/^\d{12}$/.test(cleaned)) { toast.error('Aadhar number must be 12 digits'); return; }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('aadharNumber', cleaned);
      fd.append('fullName', fullName);
      fd.append('aadharFront', frontFile);
      fd.append('aadharBack', backFile);
      // Use longer timeout for file uploads
      await api.post('/workers/upload-aadhar', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      });
      toast.success('Aadhar uploaded successfully!');
      onNext();
    } catch (err) {
      // api.js interceptor already shows the toast, but log for debugging
      console.error('Aadhar upload error:', err?.response?.data || err?.message);
    }
    setLoading(false);
  };

  const FileUploadBox = ({ label, file, onFileChange, accept = 'image/*' }) => (
    <div>
      <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>{label}</label>
      <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 24, border: '2px dashed var(--color-border)', borderRadius: 12, cursor: 'pointer', background: file ? 'var(--color-forest-pale)' : 'var(--color-cream)', transition: 'all 0.2s ease' }}>
        <input type="file" accept={accept} style={{ display: 'none' }} onChange={e => onFileChange(e.target.files?.[0])} />
        <Upload size={24} color={file ? 'var(--color-forest)' : 'var(--color-subtle)'} />
        <span style={{ fontSize: '0.85rem', color: file ? 'var(--color-forest)' : 'var(--color-subtle)' }}>{file ? file.name : 'Click to upload'}</span>
        {file && <span style={{ fontSize: '0.75rem', color: 'var(--color-forest)', fontWeight: 600 }}>✓ Selected</span>}
      </label>
    </div>
  );

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ background: 'var(--color-rust-pale)', border: '1px solid var(--color-rust-light)', borderRadius: 12, padding: 16, marginBottom: 24, fontSize: '0.85rem', color: 'var(--color-rust)' }}>
        <strong>🔒 Secure:</strong> Your Aadhar data is encrypted and stored securely. Never shared with customers.
      </div>
      <div style={{ display: 'grid', gap: 20 }}>
        <FormField label="Aadhar Number" hint="12-digit Aadhar number — will be masked">
          <input className="form-input" placeholder="XXXX XXXX XXXX" value={aadharNumber}
            onChange={e => setAadharNumber(e.target.value.replace(/(\d{4})(?=\d)/g, '$1 ').slice(0, 14))} />
        </FormField>
        <FormField label="Full Name (as on Aadhar card)">
          <input className="form-input" placeholder="Your name as on Aadhar" value={fullName} onChange={e => setFullName(e.target.value)} />
        </FormField>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <FileUploadBox label="Aadhar Front Photo" file={frontFile} onFileChange={setFrontFile} />
          <FileUploadBox label="Aadhar Back Photo" file={backFile} onFileChange={setBackFile} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
        <button type="button" className="btn btn--ghost" onClick={onBack}><ArrowLeft size={18} /> Back</button>
        <button type="submit" className="btn btn--primary btn--full btn--lg" disabled={loading}>
          {loading ? <><span className="spinner spinner--white" style={{ width: 18, height: 18 }} /> Uploading...</> : <>Upload Aadhar <ArrowRight size={18} /></>}
        </button>
      </div>
    </form>
  );
};

// Step 3 — Skills (simplified)
const Step3 = ({ onNext, onBack }) => {
  const [primarySkill, setPrimarySkill] = useState('');
  const [experience, setExperience] = useState(1);
  const [ratePerHour, setRatePerHour] = useState(300);
  const [bio, setBio] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!primarySkill) { toast.error('Please select your primary skill'); return; }
    try {
      await api.put('/workers/profile', { primarySkill, bio, yearsExperience: experience, skills: [{ skillName: primarySkill, experience, ratePerHour }] });
      toast.success('Skills saved!');
      onNext();
    } catch (err) {
      console.error('Skills save error:', err?.response?.data || err?.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'grid', gap: 20 }}>
        <FormField label="Primary Skill">
          <select className="form-select" value={primarySkill} onChange={e => setPrimarySkill(e.target.value)}>
            <option value="">Select Your Primary Skill</option>
            {SKILLS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </FormField>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <FormField label={`Years of Experience: ${experience}`}>
            <input type="range" min={1} max={40} value={experience} onChange={e => setExperience(e.target.value)}
              style={{ width: '100%', accentColor: 'var(--color-rust)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-subtle)' }}><span>1 yr</span><span>40 yrs</span></div>
          </FormField>
          <FormField label="Rate per Hour (₹)" hint="Customers will see this rate">
            <input type="number" className="form-input" value={ratePerHour} onChange={e => setRatePerHour(e.target.value)} min={100} max={5000} />
          </FormField>
        </div>
        <FormField label="Professional Bio" hint="Tell customers about yourself (max 500 characters)">
          <textarea className="form-textarea" rows={4} placeholder="Describe your experience, specializations, and what makes you the best at your skill..."
            value={bio} onChange={e => setBio(e.target.value)} maxLength={500} />
          <span style={{ fontSize: '0.75rem', color: 'var(--color-subtle)', textAlign: 'right', display: 'block' }}>{bio.length}/500</span>
        </FormField>
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
        <button type="button" className="btn btn--ghost" onClick={onBack}><ArrowLeft size={18} /> Back</button>
        <button type="submit" className="btn btn--primary btn--full btn--lg">Save Skills <ArrowRight size={18} /></button>
      </div>
    </form>
  );
};

// Step 4 — Bank Details
const Step4 = ({ onNext, onBack }) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ bankName: '', accountNumber: '', ifscCode: '', accountHolderName: '', upiId: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put('/workers/profile', { bankDetails: form });
      toast.success('Bank details saved!');
      onNext();
    } catch (err) {
      console.error('Bank details error:', err?.response?.data || err?.message);
    }
    setLoading(false);
  };

  const field = (key, label, placeholder, type = 'text') => (
    <FormField label={label}>
      <input type={type} className="form-input" placeholder={placeholder} value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
    </FormField>
  );

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ background: 'var(--color-forest-pale)', border: '1px solid var(--color-forest-light)', borderRadius: 12, padding: 16, marginBottom: 24, fontSize: '0.85rem', color: 'var(--color-forest)' }}>
        <strong>🔒 Encrypted:</strong> Bank details are encrypted with bank-grade security. Used only for payouts.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {field('accountHolderName', 'Account Holder Name (must match Aadhar)', 'John Doe')}
        {field('bankName', 'Bank Name', 'HDFC Bank')}
        {field('accountNumber', 'Account Number', 'XXXX XXXX 5432')}
        {field('ifscCode', 'IFSC Code', 'HDFC0001234')}
        <div style={{ gridColumn: '1 / -1' }}>
          {field('upiId', 'UPI ID (Optional)', 'john@upi')}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
        <button type="button" className="btn btn--ghost" onClick={onBack}><ArrowLeft size={18} /> Back</button>
        <button type="submit" className="btn btn--primary btn--full btn--lg" disabled={loading}>
          {loading ? <><span className="spinner spinner--white" style={{ width: 18, height: 18 }} /> Saving...</> : <>Save Details <ArrowRight size={18} /></>}
        </button>
      </div>
    </form>
  );
};

// Step 5 — Insurance
const Step5 = ({ onNext, onBack }) => {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({ provider: '', policyNumber: '', holderName: '', coverageAmount: '', startDate: '', endDate: '', premium: '', premiumFrequency: 'yearly' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { toast.error('Please upload insurance policy document (PDF)'); return; }
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      fd.append('insuranceDoc', file);
      await api.post('/workers/upload-insurance', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      });
      toast.success('Insurance uploaded! Verification takes 1-2 business days.');
      onNext();
    } catch (err) {
      console.error('Insurance upload error:', err?.response?.data || err?.message);
    }
    setLoading(false);
  };

  const field = (key, label, placeholder, type = 'text') => (
    <FormField label={label}>
      <input type={type} className="form-input" placeholder={placeholder} value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
    </FormField>
  );

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ background: '#FEF9E7', border: '1px solid var(--color-gold)', borderRadius: 12, padding: 16, marginBottom: 24, fontSize: '0.85rem', color: '#7D6608' }}>
        <strong>⭐ Required:</strong> Life/accident insurance is mandatory for all workers on WorkerHub. Minimum coverage: ₹2,00,000.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <FormField label="Insurance Provider">
          <select className="form-select" value={form.provider} onChange={e => setForm(f => ({ ...f, provider: e.target.value }))}>
            <option value="">Select Provider</option>
            {INSURANCE_PROVIDERS.map(p => <option key={p}>{p}</option>)}
          </select>
        </FormField>
        {field('policyNumber', 'Policy Number', 'POL12345678')}
        {field('holderName', 'Policy Holder Name', 'John Doe')}
        {field('coverageAmount', 'Coverage Amount (₹)', '500000', 'number')}
        {field('startDate', 'Policy Start Date', '', 'date')}
        {field('endDate', 'Policy End Date', '', 'date')}
        {field('premium', 'Premium Amount (₹)', '5000', 'number')}
        <FormField label="Premium Frequency">
          <select className="form-select" value={form.premiumFrequency} onChange={e => setForm(f => ({ ...f, premiumFrequency: e.target.value }))}>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </FormField>
        <div style={{ gridColumn: '1 / -1' }}>
          <FormField label="Upload Policy Document (PDF)">
            <label style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, border: '2px dashed var(--color-border)', borderRadius: 12, cursor: 'pointer', background: file ? 'var(--color-forest-pale)' : 'var(--color-cream)' }}>
              <input type="file" accept=".pdf,image/*" style={{ display: 'none' }} onChange={e => setFile(e.target.files?.[0])} />
              <Upload size={20} color={file ? 'var(--color-forest)' : 'var(--color-subtle)'} />
              <span style={{ fontSize: '0.85rem', color: file ? 'var(--color-forest)' : 'var(--color-subtle)' }}>{file ? file.name : 'Upload PDF or image of policy'}</span>
            </label>
          </FormField>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
        <button type="button" className="btn btn--ghost" onClick={onBack}><ArrowLeft size={18} /> Back</button>
        <button type="submit" className="btn btn--primary btn--full btn--lg" disabled={loading}>
          {loading ? <><span className="spinner spinner--white" style={{ width: 18, height: 18 }} /> Uploading...</> : <>Upload Insurance <ArrowRight size={18} /></>}
        </button>
      </div>
    </form>
  );
};

// Step 6 — T&C
const Step6 = ({ onNext, onBack }) => {
  const navigate = useNavigate();
  const [checks, setChecks] = useState({ tos: false, privacy: false, certify: false, conduct: false, complaint: false });
  const allChecked = Object.values(checks).every(Boolean);

  const toggle = (key) => setChecks(c => ({ ...c, [key]: !c[key] }));

  return (
    <div>
      <p style={{ color: 'var(--color-mid)', marginBottom: 24, fontSize: '0.9rem' }}>
        Please read and agree to all the following before completing your registration.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[
          { key: 'tos', label: 'I agree to the Terms of Service', link: 'View Terms' },
          { key: 'privacy', label: 'I have read and accept the Privacy Policy', link: 'View Policy' },
          { key: 'certify', label: 'I certify all information provided is accurate and genuine' },
          { key: 'conduct', label: 'I agree to WorkerHub\'s Code of Conduct for Workers' },
          { key: 'complaint', label: 'I accept the Complaint & Dispute Resolution Policy' },
        ].map(item => (
          <label key={item.key} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'pointer', padding: '12px 16px', border: `2px solid ${checks[item.key] ? 'var(--color-forest)' : 'var(--color-border)'}`, borderRadius: 10, background: checks[item.key] ? 'var(--color-forest-pale)' : '#fff', transition: 'all 0.2s' }}>
            <input type="checkbox" checked={checks[item.key]} onChange={() => toggle(item.key)} style={{ accentColor: 'var(--color-forest)', width: 18, height: 18, marginTop: 1, flexShrink: 0 }} />
            <span style={{ fontSize: '0.9rem', color: 'var(--color-charcoal)' }}>{item.label}
              {item.link && <span style={{ color: 'var(--color-rust)', fontWeight: 600, marginLeft: 6, cursor: 'pointer', textDecoration: 'underline' }}>{item.link}</span>}
            </span>
          </label>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
        <button type="button" className="btn btn--ghost" onClick={onBack}><ArrowLeft size={18} /> Back</button>
        <button type="button" className="btn btn--forest btn--full btn--lg" disabled={!allChecked}
          onClick={() => { toast.success('🎉 Registration complete! Our team will verify your profile within 1-2 business days.'); navigate('/worker/login'); }}>
          Complete Registration 🎉
        </button>
      </div>
      {!allChecked && <p style={{ fontSize: '0.8rem', color: 'var(--color-subtle)', textAlign: 'center', marginTop: 12 }}>Please check all boxes above to continue</p>}
    </div>
  );
};

export default function WorkerRegister() {
  const [step, setStep] = useState(1);
  const [stepData, setStepData] = useState({});

  const handleNext = (data = {}) => {
    setStepData(prev => ({ ...prev, ...data }));
    setStep(s => Math.min(s + 1, 6));
  };

  const handleBack = () => setStep(s => Math.max(s - 1, 1));

  const STEP_COMPONENTS = [
    <Step1 onNext={handleNext} />,
    <Step2 onNext={handleNext} onBack={handleBack} />,
    <Step3 onNext={handleNext} onBack={handleBack} />,
    <Step4 onNext={handleNext} onBack={handleBack} />,
    <Step5 onNext={handleNext} onBack={handleBack} />,
    <Step6 onNext={handleNext} onBack={handleBack} />,
  ];

  const STEP_TITLES = [
    { title: 'Create Your Account', subtitle: 'Join 5,000+ verified workers earning with WorkerHub • Takes ~10 minutes' },
    { title: 'Aadhar Verification', subtitle: 'Government-grade identity verification — your trust badge ⭐' },
    { title: 'Skills & Experience', subtitle: 'Tell customers what you\'re great at' },
    { title: 'Bank & Payment Details', subtitle: 'How will you receive your earnings?' },
    { title: 'Life Insurance', subtitle: 'Required for worker safety — policyholder protection for you' },
    { title: 'Terms & Conditions', subtitle: 'Almost there! Review and agree to complete registration' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-cream)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
      {/* Logo */}
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32, textDecoration: 'none' }}>
        <div style={{ width: 36, height: 36, background: 'var(--color-rust)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Wrench size={20} color="#fff" />
        </div>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--color-dark)' }}>WorkerHub</span>
      </Link>

      <div style={{ width: '100%', maxWidth: 720 }}>
        {/* Progress */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--color-subtle)', marginBottom: 6 }}>
            <span>Step {step} of 6</span>
            <span>{Math.round((step / 6) * 100)}% complete</span>
          </div>
          <div className="progress-bar"><div className="progress-bar__fill" style={{ width: `${(step / 6) * 100}%` }} /></div>
        </div>

        {/* Card */}
        <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}
          style={{ background: '#fff', borderRadius: 24, padding: '40px', marginTop: 24, boxShadow: 'var(--shadow-lg)' }}>
          <StepIndicator currentStep={step} />
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h2 style={{ marginBottom: 8 }}>{STEP_TITLES[step - 1].title}</h2>
            <p style={{ color: 'var(--color-mid)', fontSize: '0.9rem' }}>{STEP_TITLES[step - 1].subtitle}</p>
          </div>
          {STEP_COMPONENTS[step - 1]}
        </motion.div>

        <p style={{ textAlign: 'center', marginTop: 20, color: 'var(--color-mid)', fontSize: '0.85rem' }}>
          Already registered? <Link to="/worker/login" style={{ color: 'var(--color-rust)', fontWeight: 600 }}>Login here</Link>
        </p>
      </div>
    </div>
  );
}
