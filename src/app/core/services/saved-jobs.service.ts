import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SavedJobsService {
  private readonly storageKey = 'savedJobs';

  getSavedJobIds(): string[] {
    try {
      const parsed = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      localStorage.removeItem(this.storageKey);
      return [];
    }
  }

  isSaved(jobId: string): boolean {
    return this.getSavedJobIds().includes(String(jobId));
  }

  toggle(jobId: string): boolean {
    const id = String(jobId);
    const savedIds = this.getSavedJobIds();

    if (savedIds.includes(id)) {
      this.saveIds(savedIds.filter((savedId) => savedId !== id));
      return false;
    }

    this.saveIds([...savedIds, id]);
    return true;
  }

  remove(jobId: string): void {
    const id = String(jobId);
    this.saveIds(this.getSavedJobIds().filter((savedId) => savedId !== id));
  }

  private saveIds(ids: string[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify([...new Set(ids)]));
  }
}
