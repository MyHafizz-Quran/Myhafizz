# Configuration Supabase — Stockage des photos de profil

Ce guide décrit la configuration Supabase nécessaire pour activer l'upload et la récupération des avatars utilisateurs dans HafizComplet.

---

## 1. Créer le bucket `avatars`

Dans le **Dashboard Supabase**, allez dans **Storage > New bucket** et configurez :

| Paramètre | Valeur |
|-----------|--------|
| **Nom du bucket** | `avatars` |
| **Public bucket** | ✅ Oui (les URL seront accessibles publiquement) |
| **File size limit** | `2 MB` |
| **Allowed MIME types** | `image/jpeg, image/png, image/webp` |

---

## 2. Policies RLS pour le bucket `avatars`

Exécutez les requêtes SQL suivantes dans l'**éditeur SQL** de Supabase (**SQL Editor > New query**) :

```sql
-- Policy: Users can upload their own avatar
CREATE POLICY "Users can upload avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can update their own avatar
CREATE POLICY "Users can update avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own avatar
CREATE POLICY "Users can delete avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Anyone can view avatars (public bucket)
CREATE POLICY "Public avatar access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');
```

---

## 3. Convention de nommage des fichiers

Chaque avatar est stocké selon le format : `{user_id}/avatar.{ext}`

**Exemple :**
```
f47ac10b-58cc-4372-a567-0e02b2c3d479/avatar.png
```

---

## 4. URL publique de l'avatar

```
{SUPABASE_URL}/storage/v1/object/public/avatars/{user_id}/avatar.png
```

**Exemple :**
```
https://xxxxxxxxxxxx.supabase.co/storage/v1/object/public/avatars/f47ac10b-58cc-4372-a567-0e02b2c3d479/avatar.png
```

---

## 5. Code JavaScript — Upload et récupération

```js
// Upload de l'avatar
const { data, error } = await supabase.storage
  .from('avatars')
  .upload(`${user.id}/avatar.png`, file, {
    upsert: true,
    contentType: file.type,
  });

// Récupérer l'URL publique
const { data: { publicUrl } } = supabase.storage
  .from('avatars')
  .getPublicUrl(`${user.id}/avatar.png`);

// Mettre à jour les métadonnées utilisateur avec l'URL de l'avatar
await supabase.auth.updateUser({
  data: { avatar_url: publicUrl }
});
```

> **Note :** Le code d'upload est déjà intégré dans `src/pages/Profile.jsx` via la fonction `handleUploadAvatar`. Il suffit de créer le bucket et d'appliquer les policies ci-dessus pour que l'upload fonctionne.
