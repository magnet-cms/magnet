# Mongoose Adapter for Magnet

This package provides a Mongoose adapter for Magnet, including internationalization support for schemas.

## Internationalization

The Mongoose adapter includes built-in support for internationalization of schema properties, similar to the [mongoose-intl](https://github.com/alexkander/mongoose-intl) package.

### Usage

To use the internationalization feature, simply add the `intl: true` option to the properties that should be internationalized:

```typescript
import { Prop, Schema } from '@magnet-cms/adapter-mongoose'

@Schema()
export class Product {
  @Prop({ required: true, intl: true })
  name!: string

  @Prop({ intl: true })
  description?: string

  @Prop({ required: true })
  price!: number
}
```

The schema will be automatically transformed to support multiple languages. The internationalization plugin will:

1. Transform properties with `intl: true` to objects with locales as keys
2. Add virtual getters and setters for the properties
3. Add methods to switch between languages
4. Ensure required fields are set in the default language

### Data Structure

For each property with `intl: true`, the data will be stored in the following format:

```typescript
{
  name: {
    en: 'Product Name in English',
    es: 'Nombre del Producto en Español',
    pt: 'Nome do Produto em Português'
  }
}
```

### API

#### Model API

When working with models, you can specify the locale for queries:

```typescript
// Get products with default locale
const products = await this.productModel.find();

// Get products with Spanish locale
const spanishProducts = await this.productModel.locale('es').find();

// Get a specific product with Spanish locale
const spanishProduct = await this.productModel.locale('es').findById('123');
```

The locale method can be chained with any query method:

```typescript
// Find products with a specific query in Spanish
const spanishProducts = await this.productModel.locale('es').findMany({ price: { $gt: 100 } });

// Update a product and get the result in Spanish
const updatedProduct = await this.productModel.locale('es').update({ id: '123' }, { price: 150 });
```

#### Document API

The internationalization plugin adds the following methods to your documents:

##### Instance Methods

- `setLocale(locale: string)`: Set the locale for the current document
- `getLocale()`: Get the current locale for the document
- `getAllTranslations(field: string)`: Get all translations for a specific field
- `setAllTranslations(field: string, translations: Record<string, any>)`: Set all translations for a specific field

##### Static Methods

- `setDefaultLocale(locale: string)`: Set the default locale for all documents
- `getDefaultLocale()`: Get the default locale

### Example

```typescript
// Import the schema
import { Product } from './product'

// Create a new product
const product = new Product()
product.name = 'Product Name in English'
await product.save()

// Get the product in a different locale
const productES = await Product.findById(product.id).setLocale('es')
productES.name = 'Nombre del Producto en Español'
await productES.save()

// Get the product in the default locale
const productEN = await Product.findById(product.id)
console.log(productEN.name) // 'Product Name in English'

// Get the product in Spanish
const productES2 = await Product.findById(product.id).setLocale('es')
console.log(productES2.name) // 'Nombre del Producto en Español'

// Get all translations for a field
const allTranslations = product.getAllTranslations('name')
console.log(allTranslations)
// {
//   en: 'Product Name in English',
//   es: 'Nombre del Producto en Español'
// }

// Set all translations for a field
product.setAllTranslations('name', {
  en: 'New Product Name in English',
  es: 'Nuevo Nombre del Producto en Español',
  pt: 'Novo Nome do Produto em Português'
})
await product.save()

// Using the model API to query with a specific locale
const spanishProducts = await this.productModel.locale('es').find();
console.log(spanishProducts[0].name); // 'Nombre del Producto en Español'
```

### Configuration

By default, the internationalization plugin uses the following configuration:

```typescript
{
  locales: ['en', 'es', 'fr', 'de'],
  defaultLocale: 'en'
}
```

You can customize these settings by providing internationalization options in your MagnetModuleOptions:

```typescript
import { MagnetModule } from '@magnet-cms/core'

@Module({
  imports: [
    MagnetModule.forRoot({
      db: { /* database config */ },
      jwt: { /* jwt config */ },
      internationalization: {
        locales: ['en', 'pt', 'es'],
        defaultLocale: 'en'
      }
    })
  ]
})
export class AppModule {}
```

## License

MIT 