//wifi libraries
#include <WiFi.h>
#include <WiFiMulti.h>
//temperature/humidity sensor
#include "SHT31.h"
//http request librari
#include <HTTPClient.h>

#define HEATER_PIN 13
#define SHT31_ADDRESS 0x45
#define MAINLOOP_DELAY 1000 //10 secs 10000
#define SERVER_DELAY 6000 //10 mins 600000
#define TEMP_ERROR 1 //degrees 2 (prevent multiple switching of relay for heater

WiFiMulti WiFiMulti;
SHT31 sht;

bool connect_WiFi(const char *ssid, const char *pass){
  //if already connected
  if(WiFiMulti.run() == WL_CONNECTED){
    return true;
  }
  
  // We start by connecting to a WiFi network
  WiFiMulti.addAP(ssid, pass);

  Serial.println();
  Serial.println();
  Serial.print("Waiting for WiFi... ");
  Serial.println(ssid);

  int i = 0;
  while(WiFiMulti.run() != WL_CONNECTED) {
      Serial.print(".");
      if(i++ >= 10){
        return false;
      }
      delay(500);
  }

  Serial.println("");
  Serial.println("WiFi connected");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());

  return true;
}

void setup() {
  //setting serial
  Serial.begin(115200);
  delay(10);

  //setting temperature sensor
  sht.begin(SHT31_ADDRESS);
  
  //setting heater
  pinMode(HEATER_PIN, OUTPUT);


}

const char* host = "172.20.10.11"; //external server domain for HTTP connection

int min_temp = 28,
    req_temp = 30,
    inside_temp = 0,
    outside_temp = 0,
    
    loop_counter = 0;

bool  heater_on = false,
      going_home = false;
    
//setting wifi
const char* wifi_auth[][2] = {
  {"Keenetic-***", "*****"},
  {"****’s iPhone", "*****"}    
};




void loop() {
  //getting temperature
  sht.read(); // default = true/fast  slow/false
  inside_temp = sht.getTemperature();

  //main serial output
  if(heater_on){
    Serial.print("Heater is ON");
  }else{
    Serial.print("Heater is OFF");    
  }
  Serial.print("\tInside temp:");
  Serial.print(inside_temp, 0);
  Serial.print("\tmin_temp:");
  Serial.print(min_temp, 0);
  //Serial.print("\tInside humi:");
  //Serial.print(sht.getHumidity(), 0);
  Serial.print("\treq_temp:");
  Serial.print(req_temp, 0);
  Serial.print("\tgoing_home:");
  Serial.println(going_home, 0);



  //keeping inside temperature above minimum
  if(inside_temp + TEMP_ERROR <= min_temp){
    if(!heater_on){
      digitalWrite(HEATER_PIN, HIGH); //relay is on
      heater_on = true;
    }
  }else if(inside_temp - TEMP_ERROR >= min_temp){
    if(heater_on){
      digitalWrite(HEATER_PIN, LOW); //relay is off
      heater_on = false;
    }
  }

  //raising temperature until req_temp
  if(going_home){
    if(inside_temp + TEMP_ERROR <= req_temp){
      if(!heater_on){
        digitalWrite(HEATER_PIN, HIGH); //relay is on
        heater_on = true;
      }
    }else if(inside_temp - TEMP_ERROR >= req_temp){
      if(heater_on){
        digitalWrite(HEATER_PIN, LOW); //relay is off
        heater_on = false;
      }
    }
  }

  //connecting to the server for sending/reciving data
  if(MAINLOOP_DELAY * loop_counter >= SERVER_DELAY){
    loop_counter = 0;

    //tries to connect wifi with wifi_auth array values
    int conn_tries = 0;
    while(!connect_WiFi(wifi_auth[conn_tries][0], wifi_auth[conn_tries][1]) && conn_tries < (sizeof wifi_auth / sizeof wifi_auth[0])){conn_tries++;}
    if(conn_tries >= (sizeof wifi_auth / sizeof wifi_auth[0])){
      Serial.println("\nWiFi is NOT connected!!!");
    }else{
      Serial.println("\nWiFi is connected");

      
      WiFiClient client;

      if (client.connect(host, 3000)) {
        //sending request and data to server
        String url = "/api?dev_id=1&inside_temp=" + String(inside_temp) + "&hum=" + String(int(sht.getHumidity()));
        client.print(String("GET ") + url + " HTTP/1.1\r\n" + "Host: " + host + "\r\n" + "User-Agent: ESP32\r\n" + "Connection: close\r\n\r\n");
        
        //getting data from cloud

        //skipping headers from server
        if(client.connected()){
          String line;
          while(line = client.readStringUntil('\n')){
            //Serial.println(line);
            if(line.length() <= 1){
              break;
            }
          }
        }

        //parsing data from server
        String line = client.readStringUntil('/');
        if(isDigit(line[0]) && line){
          Serial.println(line);
          Serial.println();
          min_temp = line.toInt();
          line = client.readStringUntil('/');
          Serial.println(line);
          Serial.println();
          req_temp = line.toInt();
          line = client.readStringUntil('/');
          Serial.println(line);
          Serial.println();
          going_home = line.toInt();
        }else{
          Serial.print("Wrong answer from server: ");
          Serial.println(line);
        }
       }else{
        Serial.println("Connection unsucessful");
      }
    }
  }
  
  delay(MAINLOOP_DELAY);
  loop_counter++;
}