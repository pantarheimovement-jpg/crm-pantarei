import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from './utils';

export default function CRMSettings() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#FDF8F0] p-6" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate(createPageUrl('Dashboard'))}
            className="mb-4"
          >
            ← חזרה
          </Button>
          <h1 className="text-3xl font-bold text-[#6D436D] flex items-center gap-2">
            <Settings className="w-8 h-8" />
            הגדרות CRM
          </h1>
        </div>

        <Card className="p-6">
          <p className="text-[#5E4B35]">
            דף ההגדרות בבניה. כאן יופיעו הגדרות נוספות למערכת ה-CRM.
          </p>
        </Card>
      </div>
    </div>
  );
}