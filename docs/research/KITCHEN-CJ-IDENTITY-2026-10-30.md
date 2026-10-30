# CJ ვარიანტის იდენტიფიკაციის შემოწმება და გასაგზავნი კითხვები

პირდაპირი CJ API წაკითხვა: **2026-10-30 19:36:42 UTC**, ანუ **23:36:42 თბილისში**.
საკვლევი პროდუქტი: pid `1876836104507744257`, vid `1876836104574853122`,
SKU `CJCF226441701AZ`. [გასუფთავებული ჩანაწერი](KITCHEN-CJ-IDENTITY-2026-10-30.json).
[პროდუქტის API წყარო](https://developers.cjdropshipping.com/api2.0/v1/product/query?pid=1876836104507744257).

## რა დადასტურდა პროვაიდერის პასუხში

- ზუსტი variantKey: **Silver**; variantSellPrice: **31.60 USD**.
- აღწერის აწყობილი ზომა **54×29×150 სმ**; მასალა **carbon steel & PP**.
- აღწერის პროდუქტის წონა **4.95 კგ**; ვარიანტის/შეფუთვის მონაცემი **5500 გ**.
- აღწერაში კომპლექტაცია **1 × Storage Rack**. ეს მიმწოდებლის განცხადებაა,
  მიღებული ამანათის ფიზიკური შემოწმება ჯერ არ ჩატარებულა.
- ვარიანტის ლოგისტიკური ზომები **553×310×168 მმ**. ისინი აწყობილი ზომა არ არის.
- barcode ველის მნიშვნელობა დაბრუნდა, თუმცა მის GS1/მწარმოებლის GTIN-ად
  კუთვნილება დადასტურებული არ არის. Matching-ში GTIN-ად არ გადავიტანეთ.

ეს ახლად წაკითხული catalogue მონაცემებია და არა დამოუკიდებელი სერტიფიცირება.
მოთხოვნა არ მოიცავდა მარაგსა და freightCalculate-ს: 785 ერთეული და $0 shipping
ამ ეტაპზე არ განახლებულა. წინა დაკვირვება ახალ თარიღზე არ გადმოგვიტანია.

## რა დარჩა უცნობი

მწარმოებლის იურიდიული სახელი, მწარმოებლის მოდელი/MPN და დადასტურებული GTIN.
CJ productSku/variantSku არ არის ავტომატურად მწარმოებლის MPN.
API-ის ზედა დონის ველებში ცალკე brand/manufacturer/MPN/GTIN ველები არ დაბრუნდა;
supplierName/supplierId ველები არსებობს, მაგრამ მათი მნიშვნელობები ამ შეზღუდულ
ამონაწერში არ შეგვინახავს და მათი მწარმოებლად იდენტიფიკაცია არ გაგვიკეთებია.
აღწერაში 250 კგ დატვირთვის განცხადება ტესტირების დოკუმენტის გარეშე რჩება.

[Walmart-ის შემოწმებაში](KITCHEN-US-COMPARISON-2026-10-30.md) selected variant
Silver (5tier) და პროდუქტის სათაური ვერცხლისფერს მიუთითებს, shortDescription
კი Black-ს. Walmart brand Lowestbest / model GTJJWQ1402GHS CJ-ის SKU-სთან
გაიგივებული არ არის. საერთო ზომა/წონა/ტექსტი ერთ მწარმოებელს არ ადასტურებს.
**ჩანაწერი დარჩეს UNCERTAIN.**

## CJ-ისთვის მომზადებული ტექსტი — ჯერ არ გაგზავნილა

ჩასაკოპირებლად CJ-ის ავტორიზებულ პროდუქტის გვერდზე Contact Agent/Support-ში,
თუ ეს ფუნქცია შენს ანგარიშში ხელმისაწვდომია. შეკვეთა არ შექმნა კითხვების გასაგზავნად.

> Hello, I am researching CJ product 1876836104507744257, variant
> 1876836104574853122, SKU CJCF226441701AZ (Silver).
>
> Before considering this item, please confirm:
>
> 1. The manufacturer name and manufacturer model/part number. If it has an
>    official EAN/UPC/GTIN, please provide it and a photo of the product/package
>    label. Is the barcode in the API a CJ warehouse code or manufacturer GTIN?
> 2. Does one unit contain one complete silver five-tier rack, including all
>    shelves, poles, feet, connectors and assembly instructions? Please provide
>    the current packing list and photos of this exact silver variant.
> 3. Are assembled dimensions 54 × 29 × 150 cm, with carbon steel and PP
>    construction? Please distinguish product weight from packed shipping weight.
> 4. Does this variant have manufacturer model GTJJWQ1402GHS or Lowestbest branding,
>    or is it a different product? Please confirm only from manufacturer records.
> 5. Please provide assembly/anchoring instructions and any applicable test report
>    supporting the advertised load capacity. Is that capacity total or per shelf?
> 6. For one unit from the US warehouse to US ZIP 95829, what charges are included
>    or excluded in the shipping estimate, and what are the damaged/missing-parts
>    and return terms, including the return address and who pays return shipping?
>
> This is an information request only. Please do not place an order or connect a store.

## Walmart / SanTu-სთვის ფერის დაზუსტება — ჯერ არ გაგზავნილა

> Hello, I am checking item 1253599314, Lowestbest model GTJJWQ1402GHS.
> The selected variant is Silver (5tier), but the specifications in the description
> say Color: Black. Which color and exact manufacturer model will be shipped for
> this selected variant? Please confirm assembled dimensions, included parts and
> the manufacturer EAN/UPC/GTIN if available. This is an information request only.

მოიძიე პროდუქტის გვერდზე გამყიდველთან დაკავშირების ფუნქცია მხოლოდ მაშინ, თუ
ანგარიშიდან ხელმისაწვდომია. გარე შეტყობინება ამ სამუშაოში არ გაგზავნილა.

## პასუხის მიღებისას როგორ შეაფასო

- მხოლოდ სიტყვიერი "same item" საკმარისი არაა: შეადარე ეტიკეტი/მოდელი,
  კონკრეტული ფერი, ზომა, მასალა, კომპლექტი და მდგომარეობა.
- მონაცემის წყაროსა და თარიღს შეინახავ პროდუქტის კვლევაში; ეს ავტომატურად
  VERIFIED სტატუსს ან დამოუკიდებელ მტკიცებულებას არ ნიშნავს.
- თუ იდენტურობა დადასტურდა, კონკურენტის კონკრეტული მიწოდება და გადასახადის
  საფუძველიც ცალკე გადაამოწმე. Walmart-ის საბოლოო checkout აქ არ ჩატარებულა.
- პასუხამდე უცნობი ხარჯები უცნობად რჩება; არც გაყიდვის ფასი და არც CAC არ
  შეგვივსია. ბაზის მიგრაცია, მაღაზიის ცვლილება და ფასიანი AI მოთხოვნა არ ყოფილა.

ლეპტოპის ბაზა არ შეცვლილა; GitHub მხოლოდ ამ ანგარიშსა და კითხვების მონახაზს ინახავს.
