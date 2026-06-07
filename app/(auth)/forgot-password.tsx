import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { useAuthContext } from '../../src/context/auth.context';
import { parseAuthError } from '../../src/utils/errors';
import { colors } from '../../src/utils/theme';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const { resetPassword } = useAuthContext();

  async function handleSend() {
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError('Informe um e-mail válido');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await resetPassword(email.toLowerCase().trim());
      setSent(true);
    } catch (err: unknown) {
      setError(parseAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.back}>← Voltar</Text>
          </TouchableOpacity>

          <View style={styles.hero}>
            <Text style={styles.emoji}>🔑</Text>
            <Text style={styles.title}>Recuperar senha</Text>
            <Text style={styles.subtitle}>
              Enviaremos um link para redefinir sua senha no e-mail cadastrado.
            </Text>
          </View>

          {sent ? (
            <View style={styles.successBox}>
              <Text style={styles.successTitle}>E-mail enviado!</Text>
              <Text style={styles.successText}>
                Verifique sua caixa de entrada e siga as instruções para criar uma nova senha.
              </Text>
              <Button title="Voltar ao login" onPress={() => router.replace('/(auth)/login')} />
            </View>
          ) : (
            <View style={styles.form}>
              {error ? (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>⚠️  {error}</Text>
                </View>
              ) : null}
              <Input
                label="E-mail"
                placeholder="seu@email.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
              <Button title="Enviar link" onPress={handleSend} loading={loading} />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scroll: { padding: 24, gap: 20 },
  back: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  hero: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emoji: { fontSize: 56 },
  title: { fontSize: 26, fontWeight: '900', color: colors.text },
  subtitle: { color: colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  form: { gap: 8 },
  successBox: { gap: 12, alignItems: 'center', paddingVertical: 20 },
  successTitle: { fontSize: 20, fontWeight: '800', color: colors.success },
  successText: { color: colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  errorBanner: { backgroundColor: colors.error + '20', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: colors.error + '60' },
  errorText: { color: colors.error, fontSize: 14 },
});
