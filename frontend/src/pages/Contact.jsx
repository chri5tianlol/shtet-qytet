import React, { useState } from 'react';

function Contact() {
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        setSubmitted(true);
        setTimeout(() => setSubmitted(false), 5000);
    };

    return (
        <div className="flex-center" style={{ minHeight: '80vh', padding: '40px 20px', alignItems: 'flex-start' }}>
            <div className="glass-panel" style={{ maxWidth: '600px', width: '100%', padding: '40px' }}>
                <h1 style={{ color: 'var(--accent-color)', marginBottom: '20px', textAlign: 'center', fontSize: '36px' }}>Get in Touch</h1>

                <p style={{ fontSize: '18px', color: 'var(--text-secondary)', marginBottom: '40px', textAlign: 'center' }}>
                    Have a question, suggestion, or found a bug? We'd love to hear from you! Fill out the form below or reach out to us at <strong style={{ color: 'var(--text-primary)' }}>support@shtetqytet.com</strong>.
                </p>

                {submitted ? (
                    <div style={{ background: 'rgba(74, 222, 128, 0.1)', border: '1px solid #4ade80', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                        <h3 style={{ color: '#4ade80', marginBottom: '10px' }}>Message Sent!</h3>
                        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Thank you for reaching out. We will get back to you shortly.</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div>
                            <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '8px' }}>Your Name</label>
                            <input type="text" className="glass-input" placeholder="e.g. Agimi" required />
                        </div>

                        <div>
                            <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '8px' }}>Email Address</label>
                            <input type="email" className="glass-input" placeholder="agimi@example.com" required />
                        </div>

                        <div>
                            <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '8px' }}>Subject</label>
                            <select className="glass-input" required>
                                <option value="" disabled selected>Select an option...</option>
                                <option value="bug">Report a Bug</option>
                                <option value="suggestion">Feature Suggestion</option>
                                <option value="support">Account Support</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        <div>
                            <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '8px' }}>Message</label>
                            <textarea className="glass-input" rows="5" placeholder="How can we help?" required style={{ resize: 'vertical' }}></textarea>
                        </div>

                        <button type="submit" className="glass-btn primary" style={{ width: '100%', fontSize: '18px', padding: '12px', marginTop: '10px' }}>
                            Send Message
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}

export default Contact;
