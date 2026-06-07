import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { useAuthContext } from '../../src/context/auth.context';
import { parseAuthError } from '../../src/utils/errors';
import { colors } from '../../src/utils/theme';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});

  const { signIn } = useAuthContext();

  function validate() {
    const newErrors: typeof errors = {};
    if (!email.trim()) newErrors.email = 'Informe o e-mail';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'E-mail inválido';
    if (!password) newErrors.password = 'Informe a senha';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleLogin() {
    if (!validate()) return;
    setErrors({});
    setLoading(true);
    try {
      await signIn(email.toLowerCase().trim(), password);
      router.replace('/(tabs)');
    } catch (err: unknown) {
      setErrors(prev => ({ ...prev, general: parseAuthError(err) }));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Text style={styles.logo}>🔥</Text>
            <Text style={styles.title}>RotinaFit</Text>
          </View>

          <View style={styles.form}>
            {errors.general && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>⚠️  {errors.general}</Text>
              </View>
            )}
            <Input
              label="E-mail"
              placeholder="seu@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              error={errors.email}
            />
            <Input
              label="Senha"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secure
              error={errors.password}
            />

            <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')} style={styles.forgotLink}>
              <Text style={styles.forgotText}>Esqueceu a senha?</Text>
            </TouchableOpacity>

            <Button
              title="Entrar"
              onPress={handleLogin}
              loading={loading}
              style={styles.loginBtn}
            />

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ou</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity onPress={() => router.push('/(auth)/register')} style={styles.registerLink}>
              <Text style={styles.registerText}>Não tem conta? </Text>
              <Text style={styles.registerHighlight}>Criar conta grátis</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, padding: 24 },
  hero: { alignItems: 'center', paddingVertical: 48 },
  logo: { fontSize: 72, marginBottom: 12 },
  title: {
    fontSize: 36,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 2,
  },
  subtitle: { color: colors.textSecondary, fontSize: 16, marginTop: 8, display: 'none' },
  form: { flex: 1, gap: 0 },
  forgotLink: { alignSelf: 'flex-end', marginTop: 4, marginBottom: 4 },
  forgotText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  loginBtn: { marginTop: 4 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.textMuted, fontSize: 14 },
  registerLink: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 8 },
  registerText: { color: colors.textSecondary, fontSize: 15 },
  registerHighlight: { color: colors.primary, fontSize: 15, fontWeight: '700' },
  errorBanner: {
    backgroundColor: colors.error + '20',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.error + '60',
    marginBottom: 8,
  },
  errorBannerText: { color: colors.error, fontSize: 14, lineHeight: 20 },
});
