"use client";
import { useState } from "react";
import RNavigationBar from "../RNavigationBar/RNavigationBar";
import "./RProfile.css";

const initialProfile = {
  name: "Alex Nguyễn",
  title: "Senior Java Developer",
  company: "FPT Software",
  email: "alex.nguyen@masterinterview.io",
  phone: "+84 90 123 4567",
  timezone: "GMT+7 (Ho Chi Minh City)",
  yearsExperience: 8,
  bio: "Backend-focused engineer specializing in high-concurrency Java systems and distributed architecture. I enjoy helping candidates get comfortable with real interview pressure, not just textbook answers.",
  expertise: ["Java", "Spring Boot", "System Design", "Microservices", "SQL"],
};

const milestones = [
  {
    id: "m1",
    icon: "🎯",
    title: "100 interviews conducted",
    description:
      "Reached triple digits helping candidates prepare for technical rounds.",
    date: "May 2026",
  },
  {
    id: "m2",
    icon: "⭐",
    title: "4.9 average rating",
    description:
      "Maintained a top-tier satisfaction score across 80+ reviewed sessions.",
    date: "Apr 2026",
  },
  {
    id: "m3",
    icon: "🏆",
    title: "Top mentor of the month",
    description:
      "Recognized for the highest candidate pass-rate improvement in March.",
    date: "Mar 2026",
  },
  {
    id: "m4",
    icon: "🤝",
    title: "50 candidates hired",
    description:
      "Half of mentored candidates landed offers at their target companies.",
    date: "Jan 2026",
  },
  {
    id: "m5",
    icon: "🚀",
    title: "Joined Master Interview",
    description:
      "Started mentoring on the platform as a certified interviewer.",
    date: "Aug 2025",
  },
];

const RProfile = () => {
  const [profile, setProfile] = useState(initialProfile);
  const [draft, setDraft] = useState(initialProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [expertiseInput, setExpertiseInput] = useState("");

  const startEditing = () => {
    setDraft(profile);
    setExpertiseInput("");
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setDraft(profile);
    setExpertiseInput("");
    setIsEditing(false);
  };

  const saveEditing = () => {
    setProfile(draft);
    setIsEditing(false);
  };

  const updateField = (field, value) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const addExpertiseTag = () => {
    const value = expertiseInput.trim();
    if (!value) return;
    if (draft.expertise.includes(value)) {
      setExpertiseInput("");
      return;
    }
    setDraft((prev) => ({ ...prev, expertise: [...prev.expertise, value] }));
    setExpertiseInput("");
  };

  const removeExpertiseTag = (tag) => {
    setDraft((prev) => ({
      ...prev,
      expertise: prev.expertise.filter((t) => t !== tag),
    }));
  };

  const handleExpertiseKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addExpertiseTag();
    }
  };

  const displayed = isEditing ? draft : profile;

  return (
    <div className="rp-root">
      <RNavigationBar />
      <main className="rp-main">
        <section className="rp-inner">
          <h1 className="rp-title">-----PROFILE-----</h1>

          <div className="rp-basic-card">
            <div className="rp-basic-header">
              <div className="rp-avatar-block">
                <div className="rp-avatar">
                  {displayed.name
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")}
                </div>
                <div className="rp-name-block">
                  {isEditing ? (
                    <>
                      <input
                        className="rp-input rp-input-name"
                        value={draft.name}
                        onChange={(e) => updateField("name", e.target.value)}
                        placeholder="Full name"
                      />
                      <input
                        className="rp-input rp-input-subtitle"
                        value={draft.title}
                        onChange={(e) => updateField("title", e.target.value)}
                        placeholder="Job title"
                      />
                    </>
                  ) : (
                    <>
                      <p className="rp-name">{profile.name}</p>
                      <p className="rp-subtitle">
                        {profile.title} · {profile.company}
                      </p>
                    </>
                  )}
                </div>
              </div>

              {!isEditing ? (
                <button
                  type="button"
                  className="rp-edit-btn"
                  onClick={startEditing}
                >
                  Edit
                </button>
              ) : (
                <div className="rp-edit-actions">
                  <button
                    type="button"
                    className="rp-cancel-btn"
                    onClick={cancelEditing}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="rp-save-btn"
                    onClick={saveEditing}
                  >
                    Save
                  </button>
                </div>
              )}
            </div>

            <div className="rp-field-grid">
              <div className="rp-field">
                <span className="rp-label">Company</span>
                {isEditing ? (
                  <input
                    className="rp-input"
                    value={draft.company}
                    onChange={(e) => updateField("company", e.target.value)}
                  />
                ) : (
                  <p className="rp-value">{profile.company}</p>
                )}
              </div>

              <div className="rp-field">
                <span className="rp-label">Email</span>
                {isEditing ? (
                  <input
                    className="rp-input"
                    type="email"
                    value={draft.email}
                    onChange={(e) => updateField("email", e.target.value)}
                  />
                ) : (
                  <p className="rp-value">{profile.email}</p>
                )}
              </div>

              <div className="rp-field">
                <span className="rp-label">Phone</span>
                {isEditing ? (
                  <input
                    className="rp-input"
                    value={draft.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                  />
                ) : (
                  <p className="rp-value">{profile.phone}</p>
                )}
              </div>

              <div className="rp-field">
                <span className="rp-label">Timezone</span>
                {isEditing ? (
                  <input
                    className="rp-input"
                    value={draft.timezone}
                    onChange={(e) => updateField("timezone", e.target.value)}
                  />
                ) : (
                  <p className="rp-value">{profile.timezone}</p>
                )}
              </div>

              <div className="rp-field">
                <span className="rp-label">Years of experience</span>
                {isEditing ? (
                  <input
                    className="rp-input"
                    type="number"
                    min={0}
                    value={draft.yearsExperience}
                    onChange={(e) =>
                      updateField("yearsExperience", Number(e.target.value))
                    }
                  />
                ) : (
                  <p className="rp-value">{profile.yearsExperience} years</p>
                )}
              </div>
            </div>

            <div className="rp-field rp-field-bio">
              <span className="rp-label">About</span>
              {isEditing ? (
                <textarea
                  className="rp-textarea"
                  value={draft.bio}
                  onChange={(e) => updateField("bio", e.target.value)}
                  rows={4}
                />
              ) : (
                <p className="rp-value rp-bio-text">{profile.bio}</p>
              )}
            </div>

            <div className="rp-field">
              <span className="rp-label">Expertise</span>
              <div className="rp-tag-row">
                {displayed.expertise.map((tag) => (
                  <span key={tag} className="rp-tag">
                    {tag}
                    {isEditing && (
                      <button
                        type="button"
                        className="rp-tag-remove"
                        onClick={() => removeExpertiseTag(tag)}
                        aria-label={`Remove ${tag}`}
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
              </div>
              {isEditing && (
                <div className="rp-tag-input-row">
                  <input
                    className="rp-input rp-tag-input"
                    value={expertiseInput}
                    onChange={(e) => setExpertiseInput(e.target.value)}
                    onKeyDown={handleExpertiseKeyDown}
                    placeholder="Add a skill and press Enter"
                  />
                  <button
                    type="button"
                    className="rp-tag-add-btn"
                    onClick={addExpertiseTag}
                  >
                    Add
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="rp-milestones-block">
            <h2 className="rp-section-title">Milestones</h2>
            <div className="rp-milestone-list">
              {milestones.map((m) => (
                <div key={m.id} className="rp-milestone-card">
                  <div className="rp-milestone-icon">{m.icon}</div>
                  <div className="rp-milestone-body">
                    <div className="rp-milestone-top-row">
                      <p className="rp-milestone-title">{m.title}</p>
                      <span className="rp-milestone-date">{m.date}</span>
                    </div>
                    <p className="rp-milestone-desc">{m.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default RProfile;
