import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import type { Session } from '@supabase/supabase-js';
import * as DocumentPicker from 'expo-document-picker';
import * as Crypto from 'expo-crypto';
import { SynapseClient } from '../../packages/synapse-client';
import type {
  Answer,
  CloudDocument,
  Item,
  Workspace,
} from '../../packages/synapse-client';
import { auth } from './auth';

function Button({
  title,
  onPress,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, disabled && styles.disabled]}
    >
      <Text style={styles.buttonText}>{title}</Text>
    </Pressable>
  );
}
const Row = memo(function Row({
  item,
  onComplete,
}: {
  item: Item;
  onComplete: (id: string) => void;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.heading}>{item.title}</Text>
      <Text>
        {item.kind}
        {item.kind === 'task' && item.completed ? ' · Completed' : ''}
      </Text>
      <Text>{item.body}</Text>
      {item.kind === 'task' ? (
        <Button
          title={item.completed ? 'Reopen task' : 'Complete task'}
          onPress={() => onComplete(item.id)}
        />
      ) : null}
    </View>
  );
});
export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!auth);
  useEffect(() => {
    if (!auth) return;
    let active = true;
    auth.auth
      .getSession()
      .then(({ data }) => {
        if (active) {
          setSession(data.session);
          setReady(true);
        }
      })
      .catch(() => {
        if (active) setReady(true);
      });
    const { data } = auth.auth.onAuthStateChange((_event, value) => {
      if (active) {
        setSession(value);
        setReady(true);
      }
    });
    const listener = AppState.addEventListener('change', (value) => {
      if (value === 'active') auth?.auth.startAutoRefresh();
      else auth?.auth.stopAutoRefresh();
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
      listener.remove();
      auth?.auth.stopAutoRefresh();
    };
  }, []);
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safe}>
        {ready ? (
          <WorkspaceScreen
            key={session?.user.id ?? 'guest'}
            session={session}
          />
        ) : (
          <ActivityIndicator accessibilityLabel="Restoring session" />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
function WorkspaceScreen({ session }: { session: Session | null }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [screen, setScreen] = useState<'tasks' | 'research'>('tasks');
  const [state, setState] = useState<Workspace | null>(null);
  const [revision, setRevision] = useState<number>(0);
  const [title, setTitle] = useState('');
  const [docs, setDocs] = useState<CloudDocument[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [question, setQuestion] = useState('');
  const [consent, setConsent] = useState(false);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const origin = process.env.EXPO_PUBLIC_API_ORIGIN ?? '';
  const configured = !!auth && origin.startsWith('https://');
  const api = useMemo(
    () =>
      new SynapseClient(
        origin,
        async () =>
          (await auth?.auth.getSession())?.data.session?.access_token ?? '',
      ),
    [origin],
  );
  const run = useCallback(async (work: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setStatus('Working…');
    try {
      await work();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Request failed.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }, []);
  const complete = useCallback(
    (id: string) => {
      if (!state) return;
      void run(async () => {
        const next = {
          ...state,
          items: state.items.map((item) =>
            item.id === id && item.kind === 'task'
              ? { ...item, completed: !item.completed }
              : item,
          ),
        };
        const saved = await api.saveWorkspace(next, revision);
        setState(next);
        setRevision(saved.revision);
        setStatus('Saved to cloud.');
      });
    },
    [api, revision, run, state],
  );
  async function signIn(create = false) {
    if (!auth) return;
    const result = create
      ? await auth.auth.signUp({ email, password })
      : await auth.auth.signInWithPassword({ email, password });
    if (result.error) throw result.error;
    setPassword('');
    setStatus(
      create
        ? 'Confirm your email using the configured web deployment, then sign in.'
        : 'Signed in.',
    );
  }
  async function load() {
    const remote = await api.workspace();
    setState(remote.workspace);
    setRevision(remote.revision);
    setStatus(`Loaded cloud revision ${remote.revision}.`);
  }
  async function upload() {
    const file = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });
    if (file.canceled) {
      setStatus('Upload cancelled.');
      return;
    }
    const asset = file.assets[0];
    if (!asset || (asset.size ?? 0) > 4 * 1024 * 1024)
      throw new Error('Choose a PDF up to 4 MiB.');
    // React Native FormData accepts native URI file descriptors, not browser File objects.
    const form = new FormData();
    form.append('file', {
      uri: asset.uri,
      name: asset.name,
      type: 'application/pdf',
    } as unknown as Blob);
    const result = await api.upload(form);
    setDocs(await api.documents());
    setStatus(`PDF ${result.status}: ${result.pages} pages.`);
  }
  if (!configured)
    return (
      <View style={styles.container}>
        <Text style={styles.title}>SynapseHub</Text>
        <Text>
          Configure EXPO_PUBLIC_SUPABASE_URL,
          EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY and an HTTPS
          EXPO_PUBLIC_API_ORIGIN. Native devices cannot reach the development
          machine through localhost.
        </Text>
      </View>
    );
  if (!session)
    return (
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>SynapseHub</Text>
        <Text>Your knowledge, connected to your work.</Text>
        <TextInput
          accessibilityLabel="Email"
          placeholder="Email"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          accessibilityLabel="Password"
          placeholder="Password"
          secureTextEntry
          autoComplete="current-password"
          style={styles.input}
          value={password}
          onChangeText={setPassword}
        />
        <Button
          title="Sign in"
          disabled={busy || !email || password.length < 8}
          onPress={() => void run(() => signIn())}
        />
        <Button
          title="Create account"
          disabled={busy || !email || password.length < 8}
          onPress={() => void run(() => signIn(true))}
        />
        <Text accessibilityLiveRegion="polite">{status}</Text>
      </ScrollView>
    );
  const header = (
    <View>
      <Text style={styles.title}>SynapseHub</Text>
      <Text>{session.user.email}</Text>
      <Text accessibilityLiveRegion="polite">{status}</Text>
      {busy ? <ActivityIndicator /> : null}
      <View style={styles.actions}>
        <Button title="Tasks & notes" onPress={() => setScreen('tasks')} />
        <Button title="Research" onPress={() => setScreen('research')} />
        <Button
          title="Sign out"
          disabled={busy}
          onPress={() =>
            void run(async () => {
              const result = await auth!.auth.signOut();
              if (result.error) throw result.error;
            })
          }
        />
      </View>
    </View>
  );
  if (screen === 'tasks')
    return (
      <FlatList<Item>
        contentContainerStyle={styles.container}
        data={state?.items ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <Row item={item} onComplete={complete} />}
        ListHeaderComponent={
          <View>
            {header}
            <Button
              title="Load latest cloud copy"
              disabled={busy}
              onPress={() => void run(load)}
            />
            <Text>
              Changes save only against the loaded revision. On conflict,
              reload; no automatic overwrite.
            </Text>
            <TextInput
              accessibilityLabel="New task title"
              placeholder="New task title"
              maxLength={200}
              value={title}
              onChangeText={setTitle}
              style={styles.input}
            />
            <Button
              title="Create task"
              disabled={busy || !state || !title.trim()}
              onPress={() =>
                void run(async () => {
                  if (!state) return;
                  const next: Workspace = {
                    ...state,
                    items: [
                      ...state.items,
                      {
                        id: Crypto.randomUUID(),
                        kind: 'task',
                        title: title.trim(),
                        body: '',
                        createdAt: new Date().toISOString(),
                        due: '',
                        priority: 'normal',
                        completed: false,
                      },
                    ],
                  };
                  const saved = await api.saveWorkspace(next, revision);
                  setState(next);
                  setRevision(saved.revision);
                  setTitle('');
                  setStatus('Task saved to cloud.');
                })
              }
            />
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.card}>
            Load your cloud workspace to begin. This native client is
            online-only; no offline personal-data cache is stored.
          </Text>
        }
      />
    );
  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {header}
      <Button
        title="Refresh library"
        disabled={busy}
        onPress={() =>
          void run(async () => {
            setDocs(await api.documents());
            setStatus('Library refreshed.');
          })
        }
      />
      <Button
        title="Upload PDF to cloud"
        disabled={busy}
        onPress={() =>
          Alert.alert(
            'Upload private PDF?',
            'The original and extracted text will be stored in your account. 4 MiB, 100 pages, text PDFs only.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Choose file', onPress: () => void run(upload) },
            ],
          )
        }
      />
      {docs.map((doc) => (
        <View key={doc.id} style={styles.card}>
          <Text>
            {doc.title} · {doc.pages} pages
          </Text>
          <Switch
            accessibilityLabel={`Include ${doc.title}`}
            disabled={busy}
            value={selected.includes(doc.id)}
            onValueChange={(value) => {
              setSelected(
                value
                  ? [...selected, doc.id]
                  : selected.filter((id) => id !== doc.id),
              );
              setAnswer(null);
            }}
          />
        </View>
      ))}
      <TextInput
        accessibilityLabel="Research question"
        placeholder="Ask selected sources"
        value={question}
        onChangeText={(v) => {
          setQuestion(v);
          setAnswer(null);
        }}
        style={styles.input}
      />
      <Text>
        Allow this question and retrieved passages to be sent to the configured
        inference service. This service may run on another machine.
      </Text>
      <Switch
        accessibilityLabel="Allow inference"
        value={consent}
        onValueChange={setConsent}
      />
      <Button
        title="Find evidence"
        disabled={busy || !selected.length || !question.trim()}
        onPress={() =>
          void run(async () => {
            setAnswer(await api.ask(question, selected, false, false));
            setStatus('Retrieved evidence.');
          })
        }
      />
      <Button
        title="Generate cited answer"
        disabled={busy || !selected.length || !question.trim() || !consent}
        onPress={() =>
          void run(async () => {
            setAnswer(await api.ask(question, selected, true, consent));
            setStatus('AI response received; verify claims.');
          })
        }
      />
      {answer ? (
        <View>
          <Text>{answer.message}</Text>
          {answer.claims.map((claim, i) => (
            <View key={i} style={styles.card}>
              <Text style={styles.heading}>AI claim · page {claim.page}</Text>
              <Text>{claim.text}</Text>
              <Text>Supporting quote: {claim.quote}</Text>
            </View>
          ))}
          {answer.evidence.map((e) => (
            <View key={e.id} style={styles.card}>
              <Text style={styles.heading}>
                {e.title} · page {e.page}
              </Text>
              <Text selectable>{e.text}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f7f8fa' },
  container: { padding: 20, gap: 14 },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#202d3b',
    marginBottom: 10,
  },
  heading: {
    fontSize: 16,
    fontWeight: '600',
    color: '#202d3b',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#a8b5bd',
    borderRadius: 8,
    padding: 12,
    minHeight: 48,
    backgroundColor: '#fff',
    color: '#202d3b',
    marginVertical: 8,
  },
  card: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#dce4e8',
    borderRadius: 10,
    backgroundColor: '#fff',
    gap: 8,
    marginVertical: 6,
  },
  button: {
    backgroundColor: '#27665d',
    padding: 12,
    borderRadius: 8,
    minHeight: 48,
    justifyContent: 'center',
    marginVertical: 5,
  },
  buttonText: { color: '#fff', fontWeight: '600', textAlign: 'center' },
  disabled: { opacity: 0.45 },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 10,
  },
});
