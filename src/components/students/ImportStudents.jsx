import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Check, AlertCircle, Loader2, X, Users, Calendar } from "lucide-react";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function ImportStudents({ onImportComplete }) {
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showDuplicatesDialog, setShowDuplicatesDialog] = useState(false);
  
  const [parsedStudents, setParsedStudents] = useState([]);
  const [duplicates, setDuplicates] = useState([]);
  const [newStudents, setNewStudents] = useState([]);
  const [duplicateActions, setDuplicateActions] = useState({});

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    console.log("📁 File selected:", file.name);
    
    setIsUploading(true);
    setError(null);
    setResults(null);
    
    try {
      console.log("📤 Uploading file...");
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      const file_url = uploadResult.file_url;
      console.log("✅ File uploaded:", file_url);
      
      setIsUploading(false);
      setIsProcessing(true);
      
      console.log("🔄 Calling parseHtmlFile function...");
      const response = await base44.functions.invoke('parseHtmlFile', {
        file_url,
        startDate: startDate || null,
        endDate: endDate || null
      });
      
      const parseResult = response.data;
      console.log("📊 Parse result:", parseResult);
      
      if (!parseResult.success) {
        throw new Error(parseResult.error || "שגיאה בפרסור הקובץ");
      }
      
      if (parseResult.students.length === 0) {
        throw new Error("לא נמצאו משתתפים בטווח התאריכים שנבחר");
      }
      
      setParsedStudents(parseResult.students);
      setShowConfirmDialog(true);
      
    } catch (err) {
      console.error("❌ Error:", err);
      setError(err.message);
    } finally {
      setIsUploading(false);
      setIsProcessing(false);
      e.target.value = "";
    }
  };

  const handleConfirmImport = async () => {
    setShowConfirmDialog(false);
    setIsProcessing(true);
    
    try {
      console.log("🔍 Checking for duplicates...");
      const existingStudents = await base44.entities.Student.list();
      
      const duplicatesList = [];
      const newList = [];
      
      for (const student of parsedStudents) {
        const duplicate = existingStudents.find(existing => {
          if (student.phone && existing.phone) {
            const normalizedNew = student.phone.replace(/\D/g, '');
            const normalizedExisting = (existing.phone || '').replace(/\D/g, '');
            if (normalizedNew && normalizedNew === normalizedExisting) return true;
          }
          if (student.email && existing.email) {
            if (student.email.toLowerCase() === existing.email.toLowerCase()) return true;
          }
          if (student.full_name && existing.full_name) {
            if (student.full_name.trim().toLowerCase() === existing.full_name.trim().toLowerCase()) return true;
          }
          return false;
        });
        
        if (duplicate) {
          duplicatesList.push({ ...student, existingStudent: duplicate });
        } else {
          newList.push(student);
        }
      }
      
      console.log(`📊 Found ${newList.length} new, ${duplicatesList.length} duplicates`);
      
      setNewStudents(newList);
      setDuplicates(duplicatesList);
      
      if (duplicatesList.length > 0) {
        const actions = {};
        duplicatesList.forEach(d => {
          actions[d.full_name] = "skip";
        });
        setDuplicateActions(actions);
        setShowDuplicatesDialog(true);
      } else {
        await processImport(newList, []);
      }
      
    } catch (err) {
      console.error("❌ Error:", err);
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDuplicateAction = (studentName, action) => {
    setDuplicateActions(prev => ({
      ...prev,
      [studentName]: action
    }));
  };

  const handleConfirmDuplicates = async () => {
    setShowDuplicatesDialog(false);
    setIsProcessing(true);
    
    const toAdd = [...newStudents];
    const toMerge = [];
    const toSkip = [];
    
    for (const dup of duplicates) {
      const action = duplicateActions[dup.full_name];
      if (action === "add") {
        toAdd.push(dup);
      } else if (action === "merge") {
        toMerge.push(dup);
      } else {
        toSkip.push(dup);
      }
    }
    
    await processImport(toAdd, toMerge, toSkip);
    setIsProcessing(false);
  };

  const processImport = async (studentsToAdd, studentsToMerge = [], studentsSkipped = []) => {
    console.log(`📥 Importing ${studentsToAdd.length} students, merging ${studentsToMerge.length}`);
    
    const results = {
      added: [],
      merged: [],
      skipped: studentsSkipped.map(s => ({ name: s.full_name })),
      errors: []
    };
    
    for (const student of studentsToAdd) {
      try {
        await base44.entities.Student.create({
          full_name: student.full_name,
          phone: student.phone || "",
          email: student.email || "",
          status: "רשום",
          lead_source: "ייבוא Summit",
          notes: student.description || "",
          registration_date: student.parsedDate ? student.parsedDate.split('T')[0] : null
        });
        results.added.push({ name: student.full_name });
        console.log(`✅ Added: ${student.full_name}`);
      } catch (err) {
        results.errors.push({ name: student.full_name, error: err.message });
        console.error(`❌ Error adding ${student.full_name}:`, err);
      }
    }
    
    for (const student of studentsToMerge) {
      try {
        await base44.entities.Student.update(student.existingStudent.id, {
          notes: (student.existingStudent.notes || "") + "\n" + (student.description || ""),
        });
        results.merged.push({ name: student.full_name });
        console.log(`🔄 Merged: ${student.full_name}`);
      } catch (err) {
        results.errors.push({ name: student.full_name, error: err.message });
        console.error(`❌ Error merging ${student.full_name}:`, err);
      }
    }
    
    setResults(results);
    
    if (onImportComplete) {
      onImportComplete();
    }
  };

  const handleCancel = () => {
    setShowConfirmDialog(false);
    setShowDuplicatesDialog(false);
    setParsedStudents([]);
    setDuplicates([]);
    setNewStudents([]);
    setError(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          ייבוא משתתפים מ-Summit
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar className="w-4 h-4 inline ml-1" />
              מתאריך
            </label>
            <input
              type="date"
              className="w-full px-3 py-2 border rounded-lg"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar className="w-4 h-4 inline ml-1" />
              עד תאריך
            </label>
            <input
              type="date"
              className="w-full px-3 py-2 border rounded-lg"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
        
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition">
          <input
            type="file"
            accept=".html,.htm"
            onChange={handleFileUpload}
            className="hidden"
            id="import-file"
            disabled={isUploading || isProcessing}
          />
          <label htmlFor="import-file" className="cursor-pointer flex flex-col items-center gap-3">
            {isUploading || isProcessing ? (
              <>
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                <span className="text-blue-600 font-medium">
                  {isUploading ? "מעלה קובץ..." : "מעבד נתונים..."}
                </span>
              </>
            ) : (
              <>
                <Upload className="w-12 h-12 text-gray-400" />
                <span className="text-gray-600">לחץ להעלאת קובץ HTML</span>
              </>
            )}
          </label>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-800">שגיאה</h4>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        )}
        
        {results && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-bold text-green-800 flex items-center gap-2">
                <Check className="w-5 h-5" />
                הייבוא הושלם!
              </h4>
              <div className="text-sm text-green-700 mt-2 space-y-1">
                <p>✅ נוספו: {results.added.length} משתתפים</p>
                {results.merged.length > 0 && <p>🔄 מוזגו: {results.merged.length}</p>}
                {results.skipped.length > 0 && <p>⏭️ דולגו: {results.skipped.length}</p>}
                {results.errors.length > 0 && <p>❌ שגיאות: {results.errors.length}</p>}
              </div>
            </div>
            
            {results.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-medium text-red-800 mb-2">שגיאות:</h4>
                <ul className="text-sm text-red-700 space-y-1">
                  {results.errors.map((e, i) => (
                    <li key={i}>• {e.name}: {e.error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
      
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              אישור ייבוא
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-lg">
              נמצאו <strong className="text-blue-600">{parsedStudents.length}</strong> משתתפים לייבוא.
            </p>
            <p className="text-gray-600 mt-2">האם להמשיך?</p>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              ביטול
            </Button>
            <Button onClick={handleConfirmImport} className="bg-green-600 hover:bg-green-700">
              <Check className="w-4 h-4 ml-2" />
              המשך לייבוא
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showDuplicatesDialog} onOpenChange={setShowDuplicatesDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              נמצאו {duplicates.length} משתתפים קיימים
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3 py-4">
            {duplicates.map((dup, idx) => (
              <div key={idx} className="border rounded-lg p-3 bg-orange-50">
                <p className="font-medium">{dup.full_name}</p>
                <p className="text-sm text-gray-600">
                  {dup.phone} | {dup.email}
                </p>
                <p className="text-xs text-orange-600 mt-1">
                  קיים במערכת: {dup.existingStudent.full_name}
                </p>
                <select
                  className="mt-2 w-full border rounded-lg p-2 text-sm"
                  value={duplicateActions[dup.full_name] || "skip"}
                  onChange={(e) => handleDuplicateAction(dup.full_name, e.target.value)}
                >
                  <option value="skip">דלג - אל תייבא</option>
                  <option value="add">הוסף בכל זאת</option>
                  <option value="merge">מזג עם הקיים</option>
                </select>
              </div>
            ))}
          </div>
          
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              ביטול
            </Button>
            <Button onClick={handleConfirmDuplicates} className="bg-green-600 hover:bg-green-700">
              <Check className="w-4 h-4 ml-2" />
              אשר והמשך
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}