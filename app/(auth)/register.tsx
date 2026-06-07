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
import { colors, FITNESS_GOALS } from '../../src/utils/theme';
import { navigateBack } from '../../src/utils/navigation';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fitnessGoal, setFitnessGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { signUp } = useAuthContext();

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim() || name.trim().length < 2) e.name = 'Nome deve ter ao menos 2 caracteres';
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) e.email = 'E-mail inválido';
    if (!password || password.length < 6) e.password = 'Senha deve ter ao menos 6 caracteres';
    if (password !== confirmPassword) e.confirmPassword = 'As senhas não conferem';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleRegister() {
    if (!validate()) return;
    setErrors({});
    setLoading(true);
    try {
      await signUp(name.trim(), email.toLowerCase().trim(), password, fitnessGoal || undefined);
      router.replace('/(tabs)');
    } catch (err: unknown) {
      const msg = (err as any)?.message ?? '';
      if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('User already registered')) {
        setErrors(prev => ({ ...prev, email: 'Este e-mail já possui uma conta.' }));
      } else {
        setErrors(prev => ({ ...prev, general: parseAuthError(err) }));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigateBack('/(auth)/login')} style={styles.backBtn}>
              <Text style={styles.backText}>← Voltar</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Criar conta</Text>
            <Text style={styles.subtitle}>Vamos começar sua transformação 💪</Text>
          </View>

          <View style={styles.form}>
            {errors.general && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>⚠️  {errors.general}</Text>
              </View>
            )}
            <Input label="Como você quer ser chamado?" placeholder="Seu nome" value={name} onChangeText={setName} autoCapitalize="words" error={errors.name} />
            <Input label="E-mail" placeholder="seu@email.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" error={errors.email} />
            <Input label="Senha" placeholder="Mínimo 6 caracteres" value={password} onChangeText={setPassword} secure error={errors.password} />
            <Input label="Confirmar senha" placeholder="Repita a senha" value={confirmPassword} onChangeText={setConfirmPassword} secure error={errors.confirmPassword} />

            <Text style={styles.goalLabel}>Qual é o seu objetivo? (opcional)</Text>
            <View style={styles.goalGrid}>
              {FITNESS_GOALS.map(goal => (
                <TouchableOpacity
                  key={goal}
                  style={[styles.goalChip, fitnessGoal === goal && styles.goalChipActive]}
                  onPress={() => setFitnessGoal(fitnessGoal === goal ? '' : goal)}
                >
                  <Text style={[styles.goalChipText, fitnessGoal === goal && styles.goalChipTextActive]}>
                    {goal}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Button title="Criar conta" onPress={handleRegister} loading={loading} style={styles.btn} />

            <TouchableOpacity onPress={() => navigateBack('/(auth)/login')} style={styles.loginLink}>
              <Text style={styles.loginText}>Já tem conta? </Text>
              <Text style={styles.loginHighlight}>Entrar</Text>
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
  header: { marginBottom: 28 },
  backBtn: { marginBottom: 20 },
  backText: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  title: { fontSize: 28, fontWeight: '900', color: colors.text },
  subtitle: { color: colors.textSecondary, fontSize: 15, marginTop: 6 },
  form: {},
  goalLabel: { color: colors.textSecondary, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  goalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  goalChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  goalChipActive: { backgroundColor: colors.primary + '20', borderColor: colors.primary },
  goalChipText: { color: colors.textSecondary, fontSize: 13, fontWeight: '500' },
  goalChipTextActive: { color: colors.primary, fontWeight: '700' },
  btn: { marginTop: 8 },
  loginLink: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 16 },
  loginText: { color: colors.textSecondary, fontSize: 15 },
  loginHighlight: { color: colors.primary, fontSize: 15, fontWeight: '700' },
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
