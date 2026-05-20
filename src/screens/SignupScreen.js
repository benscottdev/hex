import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { clearSkippedLogin } from '../services/storage';
import { colors, typography, spacing, radius } from '../theme/ios';

const MIN_PASSWORD_LENGTH = 6;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignupScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validate = () => {
    if (!email.trim()) {
      setError('Please enter your email');
      return false;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      setError('Please enter a valid email address');
      return false;
    }
    if (!password) {
      setError('Please enter a password');
      return false;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return false;
    }
    setError('');
    return true;
  };

  const handleSignup = async () => {
    if (!validate()) return;
    if (!isSupabaseConfigured) {
      setError('Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env and restart the app.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: displayName.trim() ? { display_name: displayName.trim() } : undefined,
        },
      });
      if (signUpError) {
        setError(signUpError.message || 'Sign up failed. This email may already be registered.');
        return;
      }
      // If Supabase has email confirmation enabled, show message; otherwise session is set and App will switch
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await clearSkippedLogin();
        if (navigation.canGoBack()) {
          navigation.goBack();
        }
      } else {
        setError('');
        // Common case: "Check your email for the confirmation link"
        setError('Check your email for a confirmation link, then sign in.');
      }
    } catch (err) {
      const msg = err?.message || '';
      if (msg.includes('JSON') || msg.includes('Unexpected') || msg.includes('<')) {
        setError('Could not reach Supabase. Check EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env (no trailing slash on URL), then restart the dev server.');
      } else {
        setError(msg || 'Something went wrong');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.inner}>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Sign up with your email</Text>

          <TextInput
            style={styles.input}
            placeholder="Display name (optional)"
            placeholderTextColor={colors.systemGray2}
            value={displayName}
            onChangeText={setDisplayName}
            autoCapitalize="words"
            editable={!loading}
          />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.systemGray2}
            value={email}
            onChangeText={(t) => { setEmail(t); setError(''); }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />
          <TextInput
            style={styles.input}
            placeholder="Password (min 6 characters)"
            placeholderTextColor={colors.systemGray2}
            value={password}
            onChangeText={(t) => { setPassword(t); setError(''); }}
            secureTextEntry
            editable={!loading}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
            onPress={handleSignup}
            disabled={loading}
            activeOpacity={0.8}>
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.primaryButtonText}>Sign up</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate('Login')}
            disabled={loading}>
            <Text style={styles.linkText}>Already have an account? Sign in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingVertical: 24 },
  inner: { paddingHorizontal: spacing.screenPadding },
  title: { ...typography.largeTitle, color: colors.black, marginBottom: 8 },
  subtitle: { ...typography.body, color: colors.systemGray, marginBottom: 32 },
  input: {
    ...typography.body,
    backgroundColor: colors.white,
    borderRadius: radius.medium,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.systemGray5,
    color: colors.darkGrey,
  },
  error: { ...typography.footnote, color: colors.destructive, marginBottom: 12 },
  primaryButton: {
    backgroundColor: colors.ctaOrange,
    height: 50,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryButtonDisabled: { opacity: 0.7 },
  primaryButtonText: { ...typography.body, fontWeight: '600', fontSize: 18, color: colors.white },
  linkButton: { alignItems: 'center', marginTop: 24 },
  linkText: { ...typography.body, color: colors.systemGray, textDecorationLine: 'underline' },
});
