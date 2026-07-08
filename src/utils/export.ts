// Utility for exporting data to CSV, Excel (CSV compatible), and PDF (via window print)

export const formatCurrency = (amount: number, symbol: string = '$'): string => {
  return `${symbol}${amount.toFixed(2)}`;
};

export const formatDate = (dateString: string): string => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const exportToCSV = (data: any[], headers: string[], filename: string): void => {
  if (data.length === 0) return;

  const csvRows = [];
  // Add headers
  csvRows.push(headers.join(','));

  // Add rows
  for (const row of data) {
    const values = headers.map(header => {
      const val = row[header] !== undefined ? row[header] : '';
      const escaped = ('' + val).replace(/"/g, '\\"');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }

  const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToExcel = (data: any[], headers: string[], filename: string): void => {
  // Excel can open tab-separated values (TSV) with .xls extension seamlessly
  if (data.length === 0) return;

  let excelContent = headers.join('\t') + '\n';

  for (const row of data) {
    const values = headers.map(header => {
      const val = row[header] !== undefined ? row[header] : '';
      return ('' + val).replace(/\t/g, ' ');
    });
    excelContent += values.join('\t') + '\n';
  }

  const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.xls`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const printDocument = (elementId: string, title: string = 'Document'): void => {
  const content = document.getElementById(elementId);
  if (!content) return;

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  printWindow.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            color: #333;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px 12px;
            text-align: left;
          }
          th {
            background-color: #f2f2f2;
          }
          h2 {
            margin-bottom: 5px;
          }
          .header {
            margin-bottom: 20px;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
          }
          .footer {
            margin-top: 30px;
            font-size: 0.8rem;
            text-align: center;
            color: #777;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>${title}</h2>
          <p>Generated on: ${new Date().toLocaleString()}</p>
        </div>
        ${content.innerHTML}
        <div class="footer">
          <p>Thank you for using LINO Menswear POS Systems.</p>
        </div>
        <script>
          window.onload = function() {
            window.print();
            window.close();
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};
