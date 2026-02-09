import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Theme } from '@constants/theme';
import { Button } from '@components/Button';
import StorageManager from '@storage/StorageManager';
import { Note } from '../types';
import { getDigitRange, formatDigits } from '@constants/piDigits';

export const NotesScreen: React.FC<{ navigation?: any }> = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [startDigit, setStartDigit] = useState('0');
  const [endDigit, setEndDigit] = useState('10');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      const allNotes = await StorageManager.getNotes();
      setNotes(allNotes);
    } catch (e) {
      console.error('Error loading notes:', e);
    }
  };

  const saveNote = async () => {
    const start = parseInt(startDigit) || 0;
    const end = parseInt(endDigit) || 10;
    const digits = getDigitRange(start, end);

    const note: Note = editingNote ? {
      ...editingNote,
      title: newTitle || `ספרות ${start + 1}-${end}`,
      content: newContent,
      startDigit: start,
      endDigit: end,
      updatedAt: new Date().toISOString(),
    } : {
      id: Date.now().toString(),
      title: newTitle || `ספרות ${start + 1}-${end}`,
      content: newContent,
      startDigit: start,
      endDigit: end,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await StorageManager.saveNote(note);
    setShowForm(false);
    setEditingNote(null);
    setNewTitle('');
    setNewContent('');
    loadNotes();
  };

  const deleteNote = async (noteId: string) => {
    Alert.alert('מחיקת פתק', 'האם אתה בטוח?', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'מחק',
        style: 'destructive',
        onPress: async () => {
          await StorageManager.deleteNote(noteId);
          loadNotes();
        },
      },
    ]);
  };

  const editNote = (note: Note) => {
    setEditingNote(note);
    setNewTitle(note.title);
    setNewContent(note.content);
    setStartDigit(note.startDigit.toString());
    setEndDigit(note.endDigit.toString());
    setShowForm(true);
  };

  // Regular notes (exclude special notes)
  const regularNotes = notes.filter(
    n => n.id !== 'handwriting-note' && n.id !== 'summary-note'
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>הפתקים שלי</Text>
      <Text style={styles.subtitle}>רשום טריקים לזכירת ספרות פאי</Text>

      {!showForm ? (
        <Button
          title="+ פתק חדש"
          onPress={() => {
            setEditingNote(null);
            setNewTitle('');
            setNewContent('');
            setShowForm(true);
          }}
          variant="primary"
          style={{ marginBottom: 16 }}
        />
      ) : (
        <View style={styles.form}>
          <Text style={styles.formLabel}>כותרת:</Text>
          <TextInput
            style={styles.input}
            value={newTitle}
            onChangeText={setNewTitle}
            placeholder="למשל: ספרות 1-10"
            placeholderTextColor={Theme.colors.textMuted}
          />

          <View style={styles.digitRange}>
            <View style={styles.digitRangeItem}>
              <Text style={styles.formLabel}>מספרה:</Text>
              <TextInput
                style={[styles.input, styles.smallInput]}
                value={startDigit}
                onChangeText={setStartDigit}
                keyboardType="numeric"
                placeholderTextColor={Theme.colors.textMuted}
              />
            </View>
            <View style={styles.digitRangeItem}>
              <Text style={styles.formLabel}>עד ספרה:</Text>
              <TextInput
                style={[styles.input, styles.smallInput]}
                value={endDigit}
                onChangeText={setEndDigit}
                keyboardType="numeric"
                placeholderTextColor={Theme.colors.textMuted}
              />
            </View>
          </View>

          {/* Show the digits for reference */}
          <View style={styles.digitsPreview}>
            <Text style={styles.digitsPreviewLabel}>הספרות:</Text>
            <Text style={styles.digitsPreviewText}>
              {formatDigits(getDigitRange(parseInt(startDigit) || 0, parseInt(endDigit) || 10), 1)}
            </Text>
          </View>

          <Text style={styles.formLabel}>תוכן (טריק לזכירה):</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={newContent}
            onChangeText={setNewContent}
            placeholder="רשום כאן את הטריק שלך לזכירת הספרות..."
            placeholderTextColor={Theme.colors.textMuted}
            multiline
            numberOfLines={4}
          />

          <View style={styles.formButtons}>
            <Button title="שמור" onPress={saveNote} variant="primary" size="sm" />
            <Button
              title="ביטול"
              onPress={() => {
                setShowForm(false);
                setEditingNote(null);
              }}
              variant="ghost"
              size="sm"
            />
          </View>
        </View>
      )}

      {/* Notes list */}
      {regularNotes.length === 0 ? (
        <Text style={styles.emptyText}>
          אין פתקים עדיין. צור פתק ראשון כדי לזכור ספרות!
        </Text>
      ) : (
        regularNotes.map(note => (
          <View key={note.id} style={styles.noteCard}>
            <View style={styles.noteHeader}>
              <Text style={styles.noteTitle}>{note.title}</Text>
              <Text style={styles.noteDigits}>
                ספרות {note.startDigit + 1}-{note.endDigit}
              </Text>
            </View>
            <Text style={styles.noteContent}>{note.content}</Text>
            <View style={styles.noteActions}>
              <TouchableOpacity onPress={() => editNote(note)}>
                <Text style={styles.noteAction}>ערוך</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteNote(note.id)}>
                <Text style={[styles.noteAction, { color: Theme.colors.error }]}>מחק</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  content: {
    padding: Theme.spacing.md,
  },
  title: {
    fontSize: Theme.fontSize.xxl,
    color: Theme.colors.text,
    fontWeight: Theme.fontWeight.bold,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: Theme.fontSize.sm,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: Theme.spacing.lg,
  },
  emptyText: {
    color: Theme.colors.textMuted,
    textAlign: 'center',
    padding: Theme.spacing.xl,
    fontSize: Theme.fontSize.base,
  },
  // Form
  form: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.lg,
  },
  formLabel: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.fontSize.sm,
    marginBottom: 4,
  },
  input: {
    backgroundColor: Theme.colors.backgroundInput,
    borderRadius: Theme.borderRadius.sm,
    padding: 12,
    color: Theme.colors.text,
    fontSize: Theme.fontSize.base,
    marginBottom: 12,
    textAlign: 'right',
  },
  smallInput: {
    width: 80,
    textAlign: 'center',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  digitRange: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'flex-end',
  },
  digitRangeItem: {
    alignItems: 'flex-end',
  },
  digitsPreview: {
    backgroundColor: Theme.colors.backgroundInput,
    borderRadius: Theme.borderRadius.sm,
    padding: 12,
    marginBottom: 12,
  },
  digitsPreviewLabel: {
    color: Theme.colors.textMuted,
    fontSize: Theme.fontSize.xs,
    marginBottom: 4,
  },
  digitsPreviewText: {
    color: Theme.colors.primary,
    fontSize: Theme.fontSize.lg,
    fontWeight: Theme.fontWeight.bold,
    letterSpacing: 2,
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  // Note card
  noteCard: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    marginBottom: 12,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteTitle: {
    fontSize: Theme.fontSize.base,
    color: Theme.colors.text,
    fontWeight: Theme.fontWeight.semibold,
  },
  noteDigits: {
    fontSize: Theme.fontSize.xs,
    color: Theme.colors.primary,
  },
  noteContent: {
    fontSize: Theme.fontSize.sm,
    color: Theme.colors.textSecondary,
    lineHeight: 22,
    marginBottom: 8,
  },
  noteActions: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
    paddingTop: 8,
  },
  noteAction: {
    color: Theme.colors.primary,
    fontSize: Theme.fontSize.sm,
    fontWeight: Theme.fontWeight.medium,
  },
});
